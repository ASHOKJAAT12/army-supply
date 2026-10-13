const Consumption = require('../models/Consumption');
const InventoryService = require('../services/InventoryService');
const APIFeatures = require('../utils/apiFeatures');

exports.createConsumption = async (req, res, next) => {
    try {
        const { location, item, quantity, date, source, notes } = req.body;

        // This leverages the service which checks stock, deducts, and saves the consumption record
        const { consumption } = await InventoryService.consume(
            location,
            item,
            quantity,
            date,
            source,
            notes,
            req.user._id
        );

        res.status(201).json({
            success: true,
            message: 'Consumption recorded successfully',
            data: consumption,
        });
    } catch (error) {
        next(error);
    }
};

exports.getConsumptions = async (req, res, next) => {
    try {
        const feature = new APIFeatures(Consumption.find().populate('location item createdBy'), req.query)
            .filter()
            .sort();

        // Default sort newest first is handled in APIFeatures if no sort provided
        const total = await Consumption.countDocuments(feature.query.getQuery());

        feature.paginate();
        const consumptions = await feature.query;

        res.status(200).json({
            success: true,
            message: 'Consumptions fetched successfully',
            data: consumptions,
            pagination: {
                page: feature.page,
                limit: feature.limit,
                total,
                totalPages: Math.ceil(total / feature.limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.getConsumption = async (req, res, next) => {
    try {
        const consumption = await Consumption.findById(req.params.id).populate('location item createdBy');
        if (!consumption) {
            const err = new Error('Consumption record not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Consumption fetched successfully',
            data: consumption,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateConsumption = async (req, res, next) => {
    try {
        const consumption = await Consumption.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).populate('location item createdBy');

        if (!consumption) {
            const err = new Error('Consumption record not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Consumption updated successfully',
            data: consumption,
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteConsumption = async (req, res, next) => {
    try {
        const consumption = await Consumption.findByIdAndDelete(req.params.id);
        if (!consumption) {
            const err = new Error('Consumption record not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Consumption deleted successfully',
            data: null,
        });
    } catch (error) {
        next(error);
    }
};
