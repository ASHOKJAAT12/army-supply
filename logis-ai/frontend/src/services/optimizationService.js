import api from './api';

const optimizationService = {
    // Run a new optimization simulation
    runOptimization: async (payload) => {
        try {
            const response = await api.post('/api/optimization/run', payload);
            return response.data;
        } catch (error) {
            console.error("Optimization failed:", error);
            throw error;
        }
    },

    // Apply an approved optimization run
    applyOptimization: async (runId) => {
        try {
            const response = await api.post(`/api/optimization/${runId}/apply`);
            return response.data;
        } catch (error) {
            console.error(`Apply failed:`, error);
            throw error;
        }
    },

    // Get History summary
    getHistory: async () => {
        try {
            const response = await api.get('/api/optimization');
            return response.data;
        } catch (error) {
            console.error("Failed to fetch optimization history", error);
            return null; // Return null on network error to allow safe degradation
        }
    },

    // Get single run detail
    getOptimizationResult: async (runId) => {
        try {
            const response = await api.get(`/api/optimization/${runId}`);
            return response.data;
        } catch (error) {
            console.error("Failed to fetch optimization detail", error);
            throw error;
        }
    }
};

export default optimizationService;
