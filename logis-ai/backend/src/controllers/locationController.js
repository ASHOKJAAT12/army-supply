const Location = require('../models/Location');
const APIFeatures = require('../utils/apiFeatures');

exports.createLocation = async (req, res, next) => {
    try {
        const location = await Location.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Location created successfully',
            data: location,
        });
    } catch (error) {
        next(error);
    }
};

exports.getLocations = async (req, res, next) => {
    try {
        const feature = new APIFeatures(Location.find(), req.query)
            .filter()
            .search(['name', 'code'])
            .sort();

        // count independent of pagination
        const total = await Location.countDocuments(feature.query.getQuery());

        feature.paginate();
        const locations = await feature.query;

        res.status(200).json({
            success: true,
            message: 'Locations fetched successfully',
            data: locations,
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

exports.getLocation = async (req, res, next) => {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) {
            const err = new Error('Location not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Location fetched successfully',
            data: location,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateLocation = async (req, res, next) => {
    try {
        const location = await Location.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!location) {
            const err = new Error('Location not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Location updated successfully',
            data: location,
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteLocation = async (req, res, next) => {
    try {
        const location = await Location.findByIdAndDelete(req.params.id);
        if (!location) {
            const err = new Error('Location not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Location deleted successfully',
            data: null,
        });
    } catch (error) {
        next(error);
    }
};
