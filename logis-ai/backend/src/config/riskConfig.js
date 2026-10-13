// Risk calculation weights and thresholds
module.exports = {
    // Component weights (must sum to 100)
    weights: {
        inventory: 25,
        forecast: 20,
        weather: 20,
        terrain: 10,
        route: 10,
        transport: 5,
        anomaly: 5,
        priority: 5,
    },

    // Risk score levels
    levels: {
        LOW: { min: 0, max: 30, label: 'low' },
        MEDIUM: { min: 31, max: 60, label: 'medium' },
        HIGH: { min: 61, max: 80, label: 'high' },
        CRITICAL: { min: 81, max: 100, label: 'critical' }
    },

    // Sub-thresholds... Wait, they are scaled to 0-100 before weighting

    // Weather condition risk base scores (example prototypes)
    weatherRiskBase: {
        clear: 0,
        clouds: 10,
        drizzle: 30,
        rain: 50,
        heavy_rain: 70,
        thunderstorm: 85,
        snow: 65,
        heavy_snow: 90,
        mist: 40,
        fog: 50,
        sand: 60,
    },

    // Terrain risk base scores
    terrainRiskBase: {
        plains: 20,
        mixed: 50,
        desert: 55,
        hilly: 45,
        mountainous: 75,
    },

    // Priority risk base scores
    priorityRiskBase: {
        low: 10,
        medium: 30,
        high: 70,
        critical: 100,
    },

    // Timeframes (ms)
    timeframes: {
        WEATHER_CACHE_TTL: 30 * 60 * 1000, // 30 minutes
        RISK_ASSESSMENT_TTL: 60 * 60 * 1000, // 1 hour
    }
};
