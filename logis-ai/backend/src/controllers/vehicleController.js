const Vehicle = require('../models/Vehicle');
const APIFeatures = require('../utils/apiFeatures');

exports.createVehicle = async (req, res, next) => {
    try {
        const vehicle = await Vehicle.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Vehicle created successfully',
            data: vehicle,
        });
    } catch (error) {
        next(error);
    }
};

exports.getVehicles = async (req, res, next) => {
    try {
        const feature = new APIFeatures(Vehicle.find().populate('currentLocation assignedShipment'), req.query)
            .filter()
            .search(['vehicleNumber'])
            .sort();

        const total = await Vehicle.countDocuments(feature.query.getQuery());

        feature.paginate();
        const vehicles = await feature.query;

        res.status(200).json({
            success: true,
            message: 'Vehicles fetched successfully',
            data: vehicles,
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

exports.getVehicle = async (req, res, next) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id).populate('currentLocation assignedShipment');
        if (!vehicle) {
            const err = new Error('Vehicle not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Vehicle fetched successfully',
            data: vehicle,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateVehicle = async (req, res, next) => {
    try {
        const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).populate('currentLocation assignedShipment');
        if (!vehicle) {
            const err = new Error('Vehicle not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Vehicle updated successfully',
            data: vehicle,
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteVehicle = async (req, res, next) => {
    try {
        const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
        if (!vehicle) {
            const err = new Error('Vehicle not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Vehicle deleted successfully',
            data: null,
        });
    } catch (error) {
        next(error);
    }
};
