const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const APIFeatures = require('../utils/apiFeatures');
const InventoryService = require('../services/InventoryService');

exports.createShipment = async (req, res, next) => {
    try {
        req.body.createdBy = req.user._id;
        // Shipments are created as planned initially
        req.body.status = 'planned';

        const shipment = await Shipment.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Shipment created successfully',
            data: shipment,
        });
    } catch (error) {
        next(error);
    }
};

exports.getShipments = async (req, res, next) => {
    try {
        const feature = new APIFeatures(Shipment.find()
            .populate('sourceLocation destinationLocation vehicle createdBy items.item'), req.query)
            .filter()
            .search(['shipmentNumber'])
            .sort();

        const total = await Shipment.countDocuments(feature.query.getQuery());
        feature.paginate();
        const shipments = await feature.query;

        res.status(200).json({
            success: true,
            message: 'Shipments fetched successfully',
            data: shipments,
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

exports.getShipment = async (req, res, next) => {
    try {
        const shipment = await Shipment.findById(req.params.id)
            .populate('sourceLocation destinationLocation vehicle createdBy items.item');
        if (!shipment) {
            const err = new Error('Shipment not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Shipment fetched successfully',
            data: shipment,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateShipment = async (req, res, next) => {
    try {
        // Full update is tricky if it affects inventory. 
        // For safe implementation in phase 1, we can just allow updating basic fields 
        // and strictly restrict updating status via this endpoint
        const body = { ...req.body };
        delete body.status; // Prevent status change via standard update

        const shipment = await Shipment.findByIdAndUpdate(req.params.id, body, {
            new: true,
            runValidators: true,
        }).populate('sourceLocation destinationLocation vehicle createdBy items.item');

        if (!shipment) {
            const err = new Error('Shipment not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json({
            success: true,
            message: 'Shipment updated successfully',
            data: shipment,
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteShipment = async (req, res, next) => {
    try {
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) {
            const err = new Error('Shipment not found');
            err.statusCode = 404;
            return next(err);
        }

        // Cannot delete a shipment if it's currently holding reservations or is already dispatched
        if (['ready', 'dispatched', 'in_transit'].includes(shipment.status)) {
            const err = new Error('Cannot delete a shipment that is currently active. Cancel it first.');
            err.statusCode = 400;
            return next(err);
        }

        await Shipment.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Shipment deleted successfully',
            data: null,
        });
    } catch (error) {
        next(error);
    }
};

// State Transition Handlers
exports.markReady = async (req, res, next) => {
    try {
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) return next({ statusCode: 404, message: 'Shipment not found' });

        if (shipment.status !== 'planned') {
            return next({ statusCode: 400, message: 'Only planned shipments can be marked ready' });
        }

        // Reserve stock
        await InventoryService.reserveForShipment(shipment.sourceLocation, shipment.items);

        shipment.status = 'ready';
        await shipment.save();

        res.status(200).json({ success: true, message: 'Shipment marked ready and stock reserved', data: shipment });
    } catch (err) {
        next(err);
    }
};

exports.dispatchShipment = async (req, res, next) => {
    try {
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) return next({ statusCode: 404, message: 'Shipment not found' });

        if (shipment.status !== 'ready') {
            return next({ statusCode: 400, message: 'Only ready shipments can be dispatched' });
        }

        shipment.status = 'dispatched';
        shipment.dispatchDate = Date.now();
        await shipment.save();

        // Update Vehicle if assigned
        if (shipment.vehicle) {
            const vehicle = await Vehicle.findById(shipment.vehicle);
            if (vehicle) {
                vehicle.status = 'in_transit';
                vehicle.assignedShipment = shipment._id;
                await vehicle.save();
            }
        }

        res.status(200).json({ success: true, message: 'Shipment dispatched', data: shipment });
    } catch (err) {
        next(err);
    }
};

exports.deliverShipment = async (req, res, next) => {
    try {
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) return next({ statusCode: 404, message: 'Shipment not found' });

        if (shipment.status !== 'dispatched' && shipment.status !== 'in_transit') {
            return next({ statusCode: 400, message: 'Shipment must be dispatched or in_transit to be delivered' });
        }

        await InventoryService.finalizeShipmentDelivery(shipment.sourceLocation, shipment.destinationLocation, shipment.items);

        shipment.status = 'delivered';
        shipment.actualArrival = req.body.actualArrival || Date.now();
        await shipment.save();

        if (shipment.vehicle) {
            const vehicle = await Vehicle.findById(shipment.vehicle);
            if (vehicle) {
                vehicle.status = 'available';
                vehicle.currentLocation = shipment.destinationLocation; // Vehicle is now at destination
                vehicle.assignedShipment = null;
                await vehicle.save();
            }
        }

        res.status(200).json({ success: true, message: 'Shipment delivered and stock updated', data: shipment });
    } catch (err) {
        next(err);
    }
};

exports.cancelShipment = async (req, res, next) => {
    try {
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) return next({ statusCode: 404, message: 'Shipment not found' });

        if (['delivered', 'cancelled'].includes(shipment.status)) {
            return next({ statusCode: 400, message: `Cannot cancel a ${shipment.status} shipment` });
        }

        // If reserved stock needs to be released
        if (['ready', 'dispatched', 'in_transit'].includes(shipment.status)) {
            await InventoryService.releaseReservedStock(shipment.sourceLocation, shipment.items);
        }

        shipment.status = 'cancelled';
        await shipment.save();

        if (shipment.vehicle) {
            const vehicle = await Vehicle.findById(shipment.vehicle);
            if (vehicle && vehicle.assignedShipment && vehicle.assignedShipment.toString() === shipment._id.toString()) {
                vehicle.status = 'available';
                vehicle.assignedShipment = null;
                await vehicle.save();
            }
        }

        res.status(200).json({ success: true, message: 'Shipment cancelled', data: shipment });
    } catch (err) {
        next(err);
    }
};
