import api from './api';

const riskService = {
    getRiskSummary: async () => {
        const response = await api.get('/api/risk/summary');
        return response.data;
    },

    getRiskLocations: async () => {
        const response = await api.get('/api/risk/locations');
        return response.data;
    },

    getRiskShipments: async () => {
        const response = await api.get('/api/risk/shipments');
        return response.data;
    },

    getRiskRoutes: async () => {
        const response = await api.get('/api/risk/routes');
        return response.data;
    },

    getRiskById: async (id) => {
        const response = await api.get(`/api/risk/${id}`);
        return response.data;
    },

    recalculateLocationRisk: async (id) => {
        const response = await api.post(`/api/risk/calculate/location/${id}`);
        return response.data;
    },

    recalculateShipmentRisk: async (id) => {
        const response = await api.post(`/api/risk/calculate/shipment/${id}`);
        return response.data;
    },

    recalculateAll: async () => {
        const response = await api.post(`/api/risk/recalculate`);
        return response.data;
    }
};

export default riskService;
