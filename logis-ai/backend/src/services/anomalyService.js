function calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    return Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / n);
}

class AnomalyService {
    /**
     * Detects consumption anomalies based on a trailing window of historical consumption.
     * Uses rolling z-score / standard deviation.
     */
    detectAnomaly(recentData, currentConsumption) {
        if (!recentData || recentData.length < 5) {
            return {
                isAnomaly: false,
                reason: 'Insufficient historical data',
                method: 'rolling_zscore'
            };
        }

        const values = recentData.map(d => d.quantity);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = calculateStandardDeviation(values);

        if (stdDev === 0) {
            // Data is perfectly flat, any change is arguably anomalous, but we need a baseline threshold
            if (Math.abs(currentConsumption - mean) > 0) {
                return {
                    isAnomaly: true,
                    severity: 'low',
                    deviationPercent: ((currentConsumption - mean) / (mean || 1)) * 100,
                    method: 'rolling_zscore',
                    actual: currentConsumption,
                    expected: mean
                };
            }
            return { isAnomaly: false, method: 'rolling_zscore' };
        }

        const zScore = (currentConsumption - mean) / stdDev;

        // Configurable thresholds for anomaly severity based on z-score
        const isAnomaly = Math.abs(zScore) >= 2;
        let severity = 'low';

        if (Math.abs(zScore) >= 3.5) severity = 'critical';
        else if (Math.abs(zScore) >= 2.5) severity = 'high';
        else if (Math.abs(zScore) >= 2) severity = 'medium';

        return {
            isAnomaly,
            severity,
            deviationPercent: ((currentConsumption - mean) / mean) * 100,
            zScore,
            actual: currentConsumption,
            expected: mean,
            method: 'rolling_zscore'
        };
    }
}

module.exports = new AnomalyService();
