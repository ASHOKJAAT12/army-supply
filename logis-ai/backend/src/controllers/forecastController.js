const ErrorResponse = require('../utils/errorResponse');
const Forecast = require('../models/Forecast');
const ModelMeta = require('../models/ModelMeta');
const Inventory = require('../models/Inventory');
const Location = require('../models/Location');
const Item = require('../models/Item');
const AIGatewayService = require('../services/aiGatewayService');

// Configurable constants
const CACHE_FRESHNESS_HOURS = 6;
const LEAD_TIME_DAYS = 2; // Demo configurable logistics parameter
const SAFETY_STOCK_Z = 1.65; // Approx 95% service level

/**
 * Helper to process AI response into Stockout Risk array
 */
const processForecastRisk = async (locationId, itemId, aiForecasts, confidenceLevel, modelUsed) => {
    // 1. Fetch current inventory context
    const inventory = await Inventory.findOne({ location: locationId, item: itemId }).lean();

    // If no inventory record exists, we pretend there is 0 stock.
    const currentAvailable = inventory ? (inventory.currentQuantity - inventory.reservedQuantity) : 0;
    const minStock = inventory ? inventory.minimumStock : 100; // default 100
    const maxStock = inventory ? inventory.maximumStock : 1000;

    let currentProjected = currentAvailable;
    let predictedStockoutDate = null;
    let overallStatus = 'normal';

    const processedData = aiForecasts.map(f => {
        currentProjected -= f.predictedDemand;

        let pointStatus = 'normal';
        if (currentProjected <= 0) {
            pointStatus = 'stockout_risk';
            if (!predictedStockoutDate) predictedStockoutDate = f.date;
        } else if (currentProjected <= minStock) {
            pointStatus = 'critical';
            if (!predictedStockoutDate && overallStatus !== 'stockout_risk') {
                predictedStockoutDate = f.date;
                overallStatus = 'critical';
            }
        } else if (currentProjected <= minStock * 1.5) {
            pointStatus = 'warning';
            if (overallStatus !== 'critical' && overallStatus !== 'stockout_risk') {
                overallStatus = 'warning';
            }
        }

        return {
            date: new Date(f.date),
            predictedDemand: f.predictedDemand,
            projectedStock: Math.max(0, currentProjected), // Don't show confusing negatives indefinitely
            pointStatus
        };
    });

    // Replenishment Math: Total predicted demand over lead time + Safety Stock
    // To simplify: if we are at risk, replenish up to maxStock or at least enough to survive horizon + safety.
    let recommendedReplenishment = 0;
    if (overallStatus !== 'normal' || currentProjected < minStock) {
        const totalForecastDemand = aiForecasts.reduce((sum, f) => sum + f.predictedDemand, 0);

        // Safety Stock = fallback logic 20% of demand for demo
        const safetyStock = Math.round(totalForecastDemand * 0.2);
        const targetStock = totalForecastDemand + safetyStock;

        recommendedReplenishment = Math.max(0, targetStock - currentAvailable);

        // Ensure we don't ask for more than maxStock
        recommendedReplenishment = Math.min(recommendedReplenishment, maxStock - currentAvailable);
        if (recommendedReplenishment < 0) recommendedReplenishment = 0;
    }

    // Also consider insufficient_data
    if (confidenceLevel === 'low' && modelUsed === 'moving_average' && aiForecasts.every(f => f.predictedDemand === 0)) {
        overallStatus = 'insufficient_data';
        predictedStockoutDate = null;
        recommendedReplenishment = 0;
    }

    return {
        forecastData: processedData,
        stockStatus: overallStatus,
        predictedStockoutDate,
        recommendedReplenishment
    };
};

/**
 * POST /api/forecast/train
 * Trigger XGBoost model training in Py API, save ModelMeta
 */
exports.trainModel = async (req, res, next) => {
    try {
        const { locationId, itemId } = req.body;

        // Validate inputs
        if (!locationId || !itemId) {
            return next(new ErrorResponse("locationId and itemId required", 400));
        }

        const aiResponse = await AIGatewayService.trainModel(locationId, itemId);

        if (!aiResponse.success) {
            return next(new ErrorResponse("AI Engine failed to train.", 500));
        }

        const data = aiResponse.data;

        // Upsert Model Meta
        const meta = await ModelMeta.findOneAndUpdate(
            { location: locationId, item: itemId },
            {
                modelType: data.modelUsed,
                trainingSamples: data.trainingSamples,
                mae: data.mae,
                rmse: data.rmse,
                status: data.status === 'insufficient_data' ? 'insufficient_data' : 'ready',
                featureImportance: data.featureImportance,
                lastTrainedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, data: meta });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/forecast/:locationId/:itemId?horizonDays=7
 * Gets forecast, either fresh or cached.
 */
exports.getForecast = async (req, res, next) => {
    try {
        const { locationId, itemId } = req.params;
        const horizonDays = parseInt(req.query.horizonDays) || 7;

        // 1. Check if we have a fresh forecast in Mongo
        const cutoffTime = new Date(Date.now() - CACHE_FRESHNESS_HOURS * 60 * 60 * 1000);
        let existingForecast = await Forecast.findOne({
            location: locationId,
            item: itemId,
            horizonDays: horizonDays,
            generatedAt: { $gte: cutoffTime }
        });

        if (existingForecast) {
            return res.status(200).json({ success: true, data: existingForecast, cached: true });
        }

        // 2. Not fresh or missing. Generate a new one from Python AI service.
        const aiResponse = await AIGatewayService.generateForecast(locationId, itemId, horizonDays);
        if (!aiResponse.success) {
            return next(new ErrorResponse("Failed to generate forecast from engine.", 500));
        }

        const { modelUsed, confidenceLevel, forecast } = aiResponse.data;

        // 3. Process into risk metrics
        const riskMetrics = await processForecastRisk(locationId, itemId, forecast, confidenceLevel, modelUsed);

        // 4. Save to Forecast DB
        const newForecast = await Forecast.findOneAndUpdate(
            { location: locationId, item: itemId, horizonDays },
            {
                forecastData: riskMetrics.forecastData,
                stockStatus: riskMetrics.stockStatus,
                predictedStockoutDate: riskMetrics.predictedStockoutDate,
                recommendedReplenishment: riskMetrics.recommendedReplenishment,
                confidenceLevel,
                modelUsed,
                generatedAt: new Date()
            },
            { upsert: true, new: true }
        ).populate('location item');

        res.status(200).json({ success: true, data: newForecast, cached: false });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/forecast/summary
 * Returns global predictive KPI metrics 
 */
exports.getForecastSummary = async (req, res, next) => {
    try {
        const totalForecasts = await Forecast.countDocuments();
        const criticalForecasts = await Forecast.countDocuments({ stockStatus: { $in: ['critical', 'stockout_risk'] } });
        const warningForecasts = await Forecast.countDocuments({ stockStatus: 'warning' });

        const highConfidence = await Forecast.countDocuments({ confidenceLevel: 'high' });
        const lowConfidence = await Forecast.countDocuments({ confidenceLevel: 'low' });

        // Unique locations with stockout risk
        const stockoutRiskLocs = await Forecast.distinct('location', { stockStatus: 'stockout_risk' });

        const replens = await Forecast.countDocuments({ recommendedReplenishment: { $gt: 0 } });

        // Get up to 10 actionable predictions for the dashboard panel
        const actionable = await Forecast.find({ stockStatus: { $in: ['critical', 'stockout_risk'] } })
            .populate('location item')
            .sort({ predictedStockoutDate: 1 })
            .limit(10);

        res.status(200).json({
            success: true,
            data: {
                totalForecasts,
                criticalForecasts,
                warningForecasts,
                highConfidence,
                lowConfidence,
                stockoutRiskLocations: stockoutRiskLocs.length,
                replenishmentRecommendations: replens,
                actionableAlerts: actionable
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/forecast/batch
 * Schedules async multi-item forecasting
 */
exports.batchForecast = async (req, res, next) => {
    try {
        const { targets, horizonDays } = req.body;
        // targets i.e. [{locationId, itemId}]
        if (!Array.isArray(targets) || targets.length === 0) {
            return next(new ErrorResponse("targets array required", 400));
        }

        // Real-world would use a queue (BullMQ), but we simulate processing safely
        const results = { requested: targets.length, completed: 0, failed: 0 };

        // Run sequentially to protect Python microservice limits 
        for (const target of targets) {
            try {
                // Ensure model is trained first
                await AIGatewayService.trainModel(target.locationId, target.itemId);

                // Then run forecast
                const aiResponse = await AIGatewayService.generateForecast(target.locationId, target.itemId, horizonDays || 7);
                const { modelUsed, confidenceLevel, forecast } = aiResponse.data;
                const riskMetrics = await processForecastRisk(target.locationId, target.itemId, forecast, confidenceLevel, modelUsed);

                await Forecast.findOneAndUpdate(
                    { location: target.locationId, item: target.itemId, horizonDays: horizonDays || 7 },
                    {
                        forecastData: riskMetrics.forecastData,
                        stockStatus: riskMetrics.stockStatus,
                        predictedStockoutDate: riskMetrics.predictedStockoutDate,
                        recommendedReplenishment: riskMetrics.recommendedReplenishment,
                        confidenceLevel,
                        modelUsed,
                        generatedAt: new Date()
                    },
                    { upsert: true }
                );

                results.completed++;
            } catch (err) {
                console.error(`Batch item failed mapping:`, err.message);
                results.failed++;
            }
        }

        res.status(200).json({ success: true, data: results });
    } catch (err) {
        next(err);
    }
};
