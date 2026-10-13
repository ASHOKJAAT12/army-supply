const riskService = require('../services/riskService');
const RiskAssessment = require('../models/RiskAssessment');
const Location = require('../models/Location');
const Shipment = require('../models/Shipment');
const Inventory = require('../models/Inventory');

exports.getRiskSummary = async (req, res, next) => {
    try {
        const counts = await RiskAssessment.aggregate([
            { $group: { _id: "$riskLevel", count: { $sum: 1 } } }
        ]);

        const summary = { low: 0, medium: 0, high: 0, critical: 0, total: 0 };
        counts.forEach(c => {
            if (summary[c._id] !== undefined) {
                summary[c._id] = c.count;
                summary.total += c.count;
            }
        });

        // Top risk locations
        const topLocations = await RiskAssessment.find({ entityType: 'location' })
            .sort({ overallScore: -1 })
            .limit(5)
            .populate('location');

        // Top risk shipments
        const topShipments = await RiskAssessment.find({ entityType: 'shipment' })
            .sort({ overallScore: -1 })
            .limit(5)
            .populate('shipment');

        res.status(200).json({
            success: true,
            data: {
                summary,
                topLocations,
                topShipments
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.getRiskLocations = async (req, res, next) => {
    try {
        const risks = await RiskAssessment.find({ entityType: 'location' })
            .populate('location')
            .sort({ overallScore: -1 });

        res.status(200).json({ success: true, count: risks.length, data: risks });
    } catch (error) {
        next(error);
    }
};

exports.getRiskShipments = async (req, res, next) => {
    try {
        const risks = await RiskAssessment.find({ entityType: 'shipment' })
            .populate({
                path: 'shipment',
                populate: { path: 'sourceLocation destinationLocation items.item' }
            })
            .sort({ overallScore: -1 });

        res.status(200).json({ success: true, count: risks.length, data: risks });
    } catch (error) {
        next(error);
    }
};

exports.getRiskRoutes = async (req, res, next) => {
    try {
        const risks = await RiskAssessment.find({ entityType: 'route' }).sort({ overallScore: -1 });
        res.status(200).json({ success: true, count: risks.length, data: risks });
    } catch (error) {
        next(error);
    }
};

exports.getRiskById = async (req, res, next) => {
    try {
        const risk = await RiskAssessment.findById(req.params.id)
            .populate('location')
            .populate({
                path: 'shipment',
                populate: { path: 'sourceLocation destinationLocation items.item' }
            });

        if (!risk) {
            return res.status(404).json({ success: false, message: 'Risk assessment not found.' });
        }
        res.status(200).json({ success: true, data: risk });
    } catch (error) {
        next(error);
    }
};

exports.calculateLocationRisk = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await riskService.calculateLocationRisk(id);

        // Save or update existing
        const saved = await RiskAssessment.findOneAndUpdate(
            { entityType: 'location', entityId: id },
            result,
            { upsert: true, new: true, runValidators: true }
        ).populate('location');

        res.status(200).json({ success: true, data: saved });
    } catch (error) {
        next(error);
    }
};

exports.calculateShipmentRisk = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await riskService.calculateShipmentRisk(id);

        const saved = await RiskAssessment.findOneAndUpdate(
            { entityType: 'shipment', entityId: id },
            result,
            { upsert: true, new: true, runValidators: true }
        ).populate('shipment');

        res.status(200).json({ success: true, data: saved });
    } catch (error) {
        next(error);
    }
};

exports.calculateRouteRisk = async (req, res, next) => {
    try {
        const { sourceLocationId, destinationLocationId, shipmentId } = req.body;
        const result = await riskService.calculateRouteRisk(sourceLocationId, destinationLocationId, shipmentId);

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

exports.recalculateAll = async (req, res, next) => {
    try {
        // Security check handled by router permissions (operator/admin only)
        // Find all active locations and shipments and recalculate
        const locations = await Location.find({ status: 'active' });
        for (const loc of locations) {
            const r = await riskService.calculateLocationRisk(loc._id);
            await RiskAssessment.findOneAndUpdate(
                { entityType: 'location', entityId: loc._id }, r, { upsert: true }
            );
        }

        const shipments = await Shipment.find({ status: { $in: ['planned', 'ready', 'dispatched', 'in_transit'] } });
        for (const ship of shipments) {
            const r = await riskService.calculateShipmentRisk(ship._id);
            await RiskAssessment.findOneAndUpdate(
                { entityType: 'shipment', entityId: ship._id }, r, { upsert: true }
            );
        }

        res.status(200).json({ success: true, message: 'Recalculation complete.' });
    } catch (error) {
        next(error);
    }
};
