const axios = require('axios');
const ErrorResponse = require('../utils/errorResponse');

// FastAPI service runs on port 8000
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000/api/v1';

class AIGatewayService {

    /**
     * Triggers the Python AI Service to train a model and evaluates it.
     */
    static async trainModel(locationId, itemId) {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/models/train`, {
                locationId: locationId.toString(),
                itemId: itemId.toString()
            });
            return response.data;
        } catch (error) {
            console.error("AI Service Training Error:", error.message);
            if (error.code === 'ECONNREFUSED') {
                throw new ErrorResponse('Forecasting service is temporarily unavailable.', 503);
            }
            throw new ErrorResponse('Model training failed in AI engine.', 500);
        }
    }

    /**
     * Triggers the Python AI Service to predict future consumption.
     */
    static async generateForecast(locationId, itemId, horizonDays) {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/forecast`, {
                locationId: locationId.toString(),
                itemId: itemId.toString(),
                horizonDays
            });
            return response.data;
        } catch (error) {
            console.error("AI Service Inference Error:", error.message);
            if (error.code === 'ECONNREFUSED') {
                throw new ErrorResponse('Forecasting service is temporarily unavailable.', 503);
            }
            throw new ErrorResponse('Forecast generation failed. Please retry.', 500);
        }
    }

    /**
     * Checks if AI API is up
     */
    static async checkHealth() {
        try {
            const res = await axios.get(`http://127.0.0.1:8000/health`);
            return res.data;
        } catch (error) {
            return { status: "UNAVAILABLE", service: "AI Forecasting Engine" };
        }
    }
}

module.exports = AIGatewayService;
