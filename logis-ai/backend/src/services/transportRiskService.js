const Vehicle = require('../models/Vehicle');

class TransportRiskService {
    async calculateRisk(locationId) {
        // Find vehicles at or assigned into this location
        const vehicles = await Vehicle.find();

        let available = 0;
        let total = 0;
        let maintenance = 0;

        for (const v of vehicles) {
            // Simplified proxy: in reality we'd check if vehicle is currently located at locationId
            if (v.location && v.location.toString() === locationId.toString()) {
                total++;
                if (v.status === 'available') available++;
                if (v.status === 'maintenance') maintenance++;
            }
        }

        if (total === 0) {
            // Highly risky if no vehicles are there, unless it's a small depot
            return {
                score: 80,
                factors: ['No transport vehicles allocated to location']
            };
        }

        const availabilityRatio = available / total;
        let score = 0;
        let factors = [];

        if (availabilityRatio === 0) {
            score = 90;
            factors.push('0% vehicle availability');
        } else if (availabilityRatio < 0.25) {
            score = 70;
            factors.push('< 25% vehicle availability');
        } else if (availabilityRatio < 0.5) {
            score = 40;
            factors.push('Sub-optimal vehicle availability');
        } else {
            score = 10;
        }

        return {
            score,
            factors
        };
    }
}

module.exports = new TransportRiskService();
