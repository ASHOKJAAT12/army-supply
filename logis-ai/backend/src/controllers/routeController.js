const ErrorResponse = require('../utils/errorResponse');
const Location = require('../models/Location');
const geoService = require('../services/geoService');
const riskService = require('../services/riskService');

/**
 * POST /api/routes/calculate
 * Given a source and destination, calculates route distance, time, and demo risk.
 */
exports.calculateRoute = async (req, res, next) => {
    try {
        const { sourceLocationId, destinationLocationId, priority, vehicleStatus } = req.body;

        if (!sourceLocationId || !destinationLocationId) {
            return next(new ErrorResponse('Source and Destination location IDs are required', 400));
        }

        const source = await Location.findById(sourceLocationId).lean();
        const dest = await Location.findById(destinationLocationId).lean();

        if (!source || !dest) {
            return next(new ErrorResponse('Invalid source or destination location', 404));
        }

        if (source.latitude == null || source.longitude == null || dest.latitude == null || dest.longitude == null) {
            return next(new ErrorResponse('One or both locations missing coordinate data', 400));
        }

        // Calculate Haversine distance
        const distanceKm = Math.round(
            geoService.haversineDistance(
                source.latitude, source.longitude,
                dest.latitude, dest.longitude
            )
        );

        // Estimate Travel Time (assuming 50 km/h average)
        const estimatedTravelTimeMinutes = geoService.estimateTravelTimeMinutes(distanceKm, 50);

        // Calculate Risk Score based on worst terrain (destination usually dictates approach road)
        // For accurate demo, using destination terrain
        const risk = riskService.calculateRouteRisk(distanceKm, dest.terrainType, priority || 'medium', vehicleStatus);

        // GeoJSON LineString for Map
        const geometry = geoService.createLineString(
            [source.longitude, source.latitude],
            [dest.longitude, dest.latitude]
        );

        res.status(200).json({
            success: true,
            data: {
                source,
                destination: dest,
                distanceKm,
                estimatedTravelTimeMinutes,
                geometry,
                ...risk, // riskScore, riskLevel, riskFactors
            }
        });
    } catch (error) {
        next(error);
    }
};
