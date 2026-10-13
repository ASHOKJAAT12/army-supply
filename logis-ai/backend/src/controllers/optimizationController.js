const optimizationService = require('../services/optimizationService');
const OptimizationRun = require('../models/OptimizationRun');
const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const optimizationConfig = require('../config/optimizationConfig');

exports.runOptimization = async (req, res, next) => {
    try {
        const { sourceLocationId, shipmentIds, vehicleIds, objective } = req.body;

        if (!sourceLocationId || !shipmentIds || !vehicleIds || shipmentIds.length === 0 || vehicleIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Missing required optimization parameters' });
        }

        const runRecord = await optimizationService.runOptimization(
            sourceLocationId,
            shipmentIds,
            vehicleIds,
            objective || optimizationConfig.defaultWeights,
            req.user.id
        );

        res.status(200).json({
            success: true,
            data: runRecord
        });
    } catch (err) {
        // Fallback for AI service failures per requirements
        if (err.message === "Optimization service unavailable.") {
            return res.status(503).json({ success: false, message: "Advanced optimization unavailable." });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getOptimizationHistory = async (req, res, next) => {
    try {
        const runs = await OptimizationRun.find()
            .populate('sourceLocation')
            .populate('createdBy', 'name')
            .sort('-createdAt')
            .limit(20);

        res.status(200).json({
            success: true,
            results: runs.length,
            data: runs
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getOptimizationRun = async (req, res, next) => {
    try {
        const run = await OptimizationRun.findById(req.params.id)
            .populate('sourceLocation')
            .populate('result.vehicleAssignments.shipmentId')
            .populate('result.vehicleAssignments.vehicleId');

        if (!run) {
            return res.status(404).json({ success: false, message: 'Optimization run not found' });
        }

        res.status(200).json({
            success: true,
            data: run
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.applyOptimization = async (req, res, next) => {
    try {
        const run = await OptimizationRun.findById(req.params.id);

        if (!run) {
            return res.status(404).json({ success: false, message: 'Optimization run not found' });
        }

        if (run.status === 'stale') {
            return res.status(400).json({ success: false, message: 'Optimization is stale. Recalculate before applying.' });
        }

        if (run.status === 'applied') {
            return res.status(400).json({ success: false, message: 'Optimization already applied.' });
        }

        // Apply changes
        for (const assignment of run.result.vehicleAssignments) {
            await Shipment.findByIdAndUpdate(assignment.shipmentId, {
                vehicle: assignment.vehicleId,
                status: 'in_transit'
            });

            await Vehicle.findByIdAndUpdate(assignment.vehicleId, {
                status: 'in_transit'
            });
        }

        run.status = 'applied';
        await run.save();

        res.status(200).json({
            success: true,
            message: 'Optimization recommendations successfully applied.'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
