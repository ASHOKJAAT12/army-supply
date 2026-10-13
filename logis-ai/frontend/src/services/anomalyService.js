import api from './api';

const anomalyService = {
    getAnomalies: async (locationId = null, itemId = null) => {
        let url = '/api/anomalies';
        if (locationId && itemId) {
            url = `/api/anomalies/${locationId}/${itemId}`;
        }
        const response = await api.get(url);
        return response.data;
    }
};

export default anomalyService;
