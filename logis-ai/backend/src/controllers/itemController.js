const Item = require('../models/Item');
const APIFeatures = require('../utils/apiFeatures');

exports.createItem = async (req, res, next) => {
    try {
        const item = await Item.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Item created successfully',
            data: item,
        });
    } catch (error) {
        next(error);
    }
};

exports.getItems = async (req, res, next) => {
    try {
        const feature = new APIFeatures(Item.find(), req.query)
            .filter()
            .search(['name', 'code'])
            .sort();

        const total = await Item.countDocuments(feature.query.getQuery());

        feature.paginate();
        const items = await feature.query;

        res.status(200).json({
            success: true,
            message: 'Items fetched successfully',
            data: items,
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

exports.getItem = async (req, res, next) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            const err = new Error('Item not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Item fetched successfully',
            data: item,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateItem = async (req, res, next) => {
    try {
        const item = await Item.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!item) {
            const err = new Error('Item not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Item updated successfully',
            data: item,
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteItem = async (req, res, next) => {
    try {
        const item = await Item.findByIdAndDelete(req.params.id);
        if (!item) {
            const err = new Error('Item not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Item deleted successfully',
            data: null,
        });
    } catch (error) {
        next(error);
    }
};
