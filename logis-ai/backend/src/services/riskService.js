const config = require('../config/riskConfig');
const weatherService = require('./weatherService');
const terrainRiskService = require('./terrainRiskService');
const transportRiskService = require('./transportRiskService');
const Inventory = require('../models/Inventory');
const Forecast = require('../models/Forecast');
const Location = require('../models/Location');
const Shipment = require('../models/Shipment');
// Optional: geoService if we want to determine route distance for route risk

class RiskService {
    /**
     * Entry point to calculate composite risk for a given entity
     */
    async calculateLocationRisk(locationId) {
        let factors = [];
        let recommendations = [];
        const componentScores = {};

        const loc = await Location.findById(locationId);
        if (!loc) throw new Error('Location not found');

        // 1. Terrain
        const terrainRisk = terrainRiskService.calculateRisk(loc);
        componentScores.terrain = terrainRisk.score;
        factors.push(...terrainRisk.factors);

        // 2. Weather
        let weatherConfidence = 'high';
        if (loc.latitude && loc.longitude) {
            const currentW = await weatherService.getCurrentWeather(loc.latitude, loc.longitude);
            const forecastW = await weatherService.getForecast(loc.latitude, loc.longitude, 3);

            let wScore = 0;
            if (currentW.status === 'unavailable') {
                weatherConfidence = 'low';
                factors.push('Weather data unavailable (fallback applied)');
                wScore = 50; // Unknown risk buffer
            } else {
                wScore = this._calculateWeatherScore(currentW, forecastW);
                if (wScore >= 60) factors.push('High weather risk in forecast');
                if (forecastW.forecast && forecastW.forecast.some(f => f.condition === 'thunderstorm')) {
                    factors.push('Severe weather anticipated');
                    recommendations.push('Review planned movement timing');
                }
            }
            componentScores.weather = wScore;
        } else {
            componentScores.weather = 0;
        }

        // 3. Transport
        const transportRisk = await transportRiskService.calculateRisk(locationId);
        componentScores.transport = transportRisk.score;
        factors.push(...transportRisk.factors);
        if (transportRisk.score >= 70) {
            recommendations.push('Review transport allocation');
        }

        // 4. Inventory / Forecast (Aggregated for location)
        const inventoryRiskData = await this._aggregateInventoryRiskForLocation(locationId);
        componentScores.inventory = inventoryRiskData.inventoryScore;
        componentScores.forecast = inventoryRiskData.forecastScore;
        factors.push(...inventoryRiskData.factors);
        recommendations.push(...inventoryRiskData.recommendations);
        if (inventoryRiskData.confidence === 'low') weatherConfidence = 'low';

        // 5. Build composite
        componentScores.priority = config.priorityRiskBase[loc.priority || 'medium'] || 30;

        const overall = this._calculateCompositeScore(componentScores);
        const level = this._getRiskLevel(overall);

        if (overall >= 60 && weatherConfidence === 'high') {
            recommendations.push('Escalate for logistics review');
        }

        return {
            entityType: 'location',
            entityId: locationId,
            location: locationId,
            overallScore: Math.round(overall),
            riskLevel: level,
            componentScores,
            factors: [...new Set(factors)],
            recommendations: [...new Set(recommendations)],
            confidence: weatherConfidence
        };
    }

    async calculateShipmentRisk(shipmentId) {
        let factors = [];
        let recommendations = [];
        const componentScores = {};

        const shipment = await Shipment.findById(shipmentId)
            .populate('sourceLocation')
            .populate('destinationLocation');

        if (!shipment) throw new Error('Shipment not found');

        // Priority
        componentScores.priority = config.priorityRiskBase[shipment.priority || 'medium'] || 30;
        if (componentScores.priority >= 70) factors.push('High shipment priority');

        // Dest location risk
        const destRisk = await this.calculateLocationRisk(shipment.destinationLocation._id);

        // Transfer key risk areas from destination
        componentScores.weather = destRisk.componentScores.weather;
        if (componentScores.weather >= 60) {
            factors.push('High weather risk at destination');
            recommendations.push('Evaluate alternate route options or delay');
        }

        componentScores.inventory = destRisk.componentScores.inventory;
        if (componentScores.inventory >= 75) {
            factors.push('Critical destination inventory');
        }

        componentScores.terrain = destRisk.componentScores.terrain;
        componentScores.forecast = destRisk.componentScores.forecast;

        // Transport
        if (shipment.vehicle) {
            // Basic transport proxy if vehicle assigned
            componentScores.transport = 10;
        } else {
            componentScores.transport = 60;
            factors.push('No vehicle assigned to shipment');
        }

        const overall = this._calculateCompositeScore(componentScores);
        const level = this._getRiskLevel(overall);

        return {
            entityType: 'shipment',
            entityId: shipmentId,
            shipment: shipmentId,
            overallScore: Math.round(overall),
            riskLevel: level,
            componentScores,
            factors: [...new Set(factors)],
            recommendations: [...new Set(recommendations)],
            confidence: destRisk.confidence
        };
    }

    async calculateRouteRisk(sourceLocationId, destinationLocationId, shipmentId) {
        const destRisk = await this.calculateLocationRisk(destinationLocationId);
        let factors = ['Destination route analyzed'];
        let recommendations = [];

        let componentScores = {
            weather: destRisk.componentScores.weather,
            terrain: destRisk.componentScores.terrain,
            inventory: destRisk.componentScores.inventory,
            route: 50 // Default route base
        };

        if (componentScores.weather >= 60) factors.push('High weather risk along route');
        if (componentScores.terrain >= 60) factors.push('Challenging route terrain');
        if (componentScores.inventory >= 75) factors.push('Critical destination inventory accelerates urgency');

        if (shipmentId) {
            const ship = await Shipment.findById(shipmentId);
            if (ship) {
                componentScores.priority = config.priorityRiskBase[ship.priority || 'medium'] || 30;
                if (componentScores.priority >= 70) factors.push('Critical shipment urgency affecting route decisions');
            }
        }

        const overallScore = Math.round(this._calculateCompositeScore(componentScores));

        return {
            riskScore: overallScore,
            riskLevel: this._getRiskLevel(overallScore),
            factors
        };
    }

    _calculateWeatherScore(current, forecastData) {
        const base = config.weatherRiskBase;
        let currentScore = base[current.condition] || 0;
        currentScore += (current.windSpeed > 30 ? 20 : 0);

        let highestForecastScore = 0;
        if (forecastData && forecastData.forecast) {
            for (const f of forecastData.forecast) {
                let fs = base[f.condition] || 0;
                fs += (f.windSpeed > 30 ? 20 : 0);
                if (fs > highestForecastScore) highestForecastScore = fs;
            }
        }

        let wScore = (currentScore * 0.6) + (highestForecastScore * 0.4);
        return Math.min(100, Math.max(0, wScore));
    }

    async _aggregateInventoryRiskForLocation(locationId) {
        const inventories = await Inventory.find({ location: locationId });
        const forecasts = await Forecast.find({ location: locationId });

        let maxInvScore = 0;
        let maxFcstScore = 0;
        let factors = [];
        let recs = [];
        let confidence = 'high';

        for (const inv of inventories) {
            const fcst = forecasts.find(f => f.item.toString() === inv.item.toString());

            let invScore = 0;
            if (inv.currentQuantity <= inv.minimumStock) {
                invScore = 90;
                factors.push('Minimum stock broken');
                recs.push('Review replenishment recommendation immediately');
            } else if (inv.currentQuantity <= inv.minimumStock * 1.5) {
                invScore = 50;
            } else {
                invScore = 10;
            }

            if (invScore > maxInvScore) maxInvScore = invScore;

            if (fcst) {
                let fScore = 0;
                if (fcst.predictedStockoutDate) {
                    const daysToStockout = (new Date(fcst.predictedStockoutDate) - new Date()) / (1000 * 60 * 60 * 24);
                    if (daysToStockout <= 1) {
                        fScore = 95;
                        factors.push(`Predicted stockout <= 1 day for an item`);
                        recs.push('Prioritize replenishment planning');
                    } else if (daysToStockout <= 3) {
                        fScore = 80;
                        factors.push(`Predicted stockout <= 3 days`);
                    } else if (daysToStockout <= 7) {
                        fScore = 60;
                        factors.push(`Projected stock reaches minimum threshold within 7 days`);
                    }
                } else if (fcst.stockStatus === 'critical') {
                    fScore = 70;
                }
                if (fScore > maxFcstScore) maxFcstScore = fScore;
                if (fcst.confidenceLevel === 'low') confidence = 'medium';
            }
        }

        return {
            inventoryScore: maxInvScore,
            forecastScore: maxFcstScore,
            factors,
            recommendations: recs,
            confidence
        };
    }

    _calculateCompositeScore(scores) {
        const { weights } = config;
        let total = 0;
        let usedWeight = 0;
        for (const [key, w] of Object.entries(weights)) {
            if (scores[key] !== undefined) {
                total += (scores[key] * (w / 100));
                usedWeight += w;
            }
        }
        if (usedWeight === 0) return 0;
        const finalScore = (total / (usedWeight / 100));
        return Math.min(100, Math.max(0, finalScore));
    }

    _getRiskLevel(score) {
        if (score <= config.levels.LOW.max) return config.levels.LOW.label;
        if (score <= config.levels.MEDIUM.max) return config.levels.MEDIUM.label;
        if (score <= config.levels.HIGH.max) return config.levels.HIGH.label;
        return config.levels.CRITICAL.label;
    }
}

module.exports = new RiskService();
