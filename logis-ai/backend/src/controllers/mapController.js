const Location = require('../models/Location');
const Vehicle = require('../models/Vehicle');
const Shipment = require('../models/Shipment');

/**
 * GET /api/map/overview
 * Returns an aggregated set of geospatial data for the command-center map.
 */
exports.getOverview = async (req, res, next) => {
    try {
        // Fetch all active/operational locations
        const locations = await Location.find().lean();

        // Fetch vehicles, optionally populating the currentLocation explicitly
        // as well as identifying if they have currentGeoPoint set
        const vehicles = await Vehicle.find().populate('currentLocation').lean();

        // Fetch only active shipments for drawing routes
        const activeShipmentStatuses = ['planned', 'ready', 'dispatched', 'in_transit'];
        const shipments = await Shipment.find({ status: { $in: activeShipmentStatuses } })
            .populate('sourceLocation destinationLocation vehicle')
            .lean();

        // Optional: you can derive if a location is critical from inventory locally
        // or through the frontend. We will return the raw sets and let the frontend 
        // merge or we can attach minimal health flags if desired.

        res.status(200).json({
            success: true,
            data: {
                locations,
                vehicles,
                shipments
            }
        });
    } catch (error) {
        next(error);
    }
};
