const Inventory = require('../models/Inventory');
const APIFeatures = require('../utils/apiFeatures');

exports.createInventory = async (req, res, next) => {
    try {
        const inventory = await Inventory.create(req.body);
        const populated = await Inventory.findById(inventory._id).populate('location item');
        res.status(201).json({
            success: true,
            message: 'Inventory created successfully',
            data: populated,
        });
    } catch (error) {
        next(error);
    }
};

exports.getInventories = async (req, res, next) => {
    try {
        let query = Inventory.find().populate('location item');

        let reqQuery = { ...req.query };
        // Status filter is virtal, so we can't filter via pure Mongoose query easily without aggregation,
        // but since requirement mentions `?status=`, we can do a naive filter if required.
        // Wait, status is a virtual field on the model! We cannot `$match` on a virtual field easily.
        // I will let it fetch and then filter by status in JS if status is provided, or better use aggregation.
        // But for simplicity, we can do JS filtering.
        // Let's rely on JS filtering for status.

        const statusFilter = reqQuery.status;
        delete reqQuery.status; // Delete it before passing to APIFeatures

        const feature = new APIFeatures(query, reqQuery)
            .filter()
            .sort();

        // fetch all if status is present to filter in JS (or aggregate, but let's just do JS for simple case)
        if (statusFilter) {
            delete feature.queryString.page;
            delete feature.queryString.limit;
            let results = await feature.query;
            results = results.filter(inv => inv.status === statusFilter);

            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;

            const total = results.length;
            const paginatedResults = results.slice(skip, skip + limit);

            return res.status(200).json({
                success: true,
                message: 'Inventory fetched successfully',
                data: paginatedResults,
                pagination: {
                    page, limit, total, totalPages: Math.ceil(total / limit)
                }
            });
        }

        const total = await Inventory.countDocuments(feature.query.getQuery());
        feature.paginate();
        const inventories = await feature.query;

        res.status(200).json({
            success: true,
            message: 'Inventory fetched successfully',
            data: inventories,
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

exports.getInventory = async (req, res, next) => {
    try {
        const inventory = await Inventory.findById(req.params.id).populate('location item');
        if (!inventory) {
            const err = new Error('Inventory not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Inventory fetched successfully',
            data: inventory,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateInventory = async (req, res, next) => {
    try {
        const inventory = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).populate('location item');

        if (!inventory) {
            const err = new Error('Inventory not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Inventory updated successfully',
            data: inventory,
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteInventory = async (req, res, next) => {
    try {
        const inventory = await Inventory.findByIdAndDelete(req.params.id);
        if (!inventory) {
            const err = new Error('Inventory not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Inventory deleted successfully',
            data: null,
        });
    } catch (error) {
        next(error);
    }
};

exports.getCriticalInventory = async (req, res, next) => {
    try {
        // Fetch all, filter for critical
        const inventories = await Inventory.find().populate('location item');
        const critical = inventories.filter(inv => inv.status === 'critical');

        res.status(200).json({
            success: true,
            message: 'Critical inventory fetched',
            data: critical,
            pagination: { total: critical.length }
        });
    } catch (error) {
        next(error);
    }
};

exports.getInventorySummary = async (req, res, next) => {
    try {
        const inventories = await Inventory.find();
        let normalCount = 0, lowCount = 0, criticalCount = 0, totalAvailable = 0;

        inventories.forEach(inv => {
            if (inv.status === 'normal') normalCount++;
            if (inv.status === 'low') lowCount++;
            if (inv.status === 'critical') criticalCount++;
            totalAvailable += inv.availableQuantity;
        });

        res.status(200).json({
            success: true,
            message: 'Inventory summary fetched',
            data: {
                total: inventories.length,
                normalCount,
                lowCount,
                criticalCount,
                totalAvailable
            }
        });
    } catch (error) {
        next(error);
    }
};
