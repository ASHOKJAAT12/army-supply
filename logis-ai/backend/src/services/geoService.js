/**
 * Geospatial Utilities Service
 * Implements Haversine formula and route time estimations.
 */

// Earth's approximate radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the great-circle distance between two points on a sphere
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in kilometers
 */
exports.haversineDistance = (lat1, lon1, lat2, lon2) => {
    // Validate inputs
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
        throw new Error('Invalid coordinate parameters');
    }

    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
};

/**
 * Estimates travel time assuming a generic vehicle on mixed terrain
 * @param {number} distanceKm 
 * @param {number} averageSpeedKmH 
 * @returns {number} estimated travel time in minutes
 */
exports.estimateTravelTimeMinutes = (distanceKm, averageSpeedKmH = 50) => {
    if (distanceKm < 0) return 0;
    // Assume 0.7 terrain adjustment multiplier for realistic operations as stated in Phase 3
    const effectiveSpeed = averageSpeedKmH * 0.7;

    // time = distance / speed -> converted to minutes
    const timeHours = distanceKm / effectiveSpeed;
    const timeMinutes = Math.round(timeHours * 60);

    return timeMinutes;
};

/**
 * Creates a GeoJSON LineString connecting two coordinates
 * @param {Array<number>} sourceCoord [longitude, latitude]
 * @param {Array<number>} destCoord [longitude, latitude]
 * @returns {Object} GeoJSON LineString
 */
exports.createLineString = (sourceCoord, destCoord) => {
    return {
        type: 'LineString',
        coordinates: [
            sourceCoord,
            destCoord
        ]
    };
};
