const { terrainRiskBase } = require('../config/riskConfig');

class TerrainRiskService {
    /**
     * @param {Object} location - Location Mongoose document
     */
    calculateRisk(location) {
        if (!location || !location.terrainType) {
            return { score: 0, factors: [] };
        }

        const terrain = location.terrainType.toLowerCase();
        let score = terrainRiskBase[terrain] || 20; // Default to 'plains' if unknown

        const factors = [];

        if (score >= 50) {
            factors.push(`Challenging terrain (${terrain})`);
        } else if (score >= 30) {
            factors.push(`Moderate terrain (${terrain})`);
        }

        return {
            score,
            factors
        };
    }
}

module.exports = new TerrainRiskService();
