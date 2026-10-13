const anomalyService = require('../services/anomalyService');
const Consumption = require('../models/Consumption');

exports.detectAnomalies = async (req, res, next) => {
    try {
        const { locationId, itemId } = req.body;
        // In reality you would loop over all recent consumption, but for demo we just check the most recent

        let query = {};
        if (locationId) query.location = locationId;
        if (itemId) query.item = itemId;

        const recent = await Consumption.find(query).sort({ date: -1 }).limit(10);

        if (recent.length < 5) {
            return res.json({ success: true, data: { isAnomaly: false, reason: 'Insufficient data' } });
        }

        const latest = recent[0].quantity;
        const history = recent.slice(1);

        const result = anomalyService.detectAnomaly(history, latest);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

exports.getAnomalies = async (req, res, next) => {
    try {
        // Mock returning a list of anomalies. In a real system we would save detected anomalies to DB.
        // For Phase 5 we process on the fly for the dashboard map or query.
        const consumptions = await Consumption.find().sort({ date: -1 }).limit(100).populate('location').populate('item');
        const grouped = {};
        for (let c of consumptions) {
            const key = `${c.location._id}-${c.item._id}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(c);
        }

        const anomalies = [];
        for (const [key, records] of Object.entries(grouped)) {
            if (records.length >= 5) {
                const latest = records[0];
                const history = records.slice(1);
                const result = anomalyService.detectAnomaly(history, latest.quantity);
                if (result.isAnomaly) {
                    anomalies.push({
                        location: latest.location,
                        item: latest.item,
                        date: latest.date,
                        ...result
                    });
                }
            }
        }

        res.json({
            success: true,
            count: anomalies.length,
            data: anomalies
        });
    } catch (error) {
        next(error);
    }
};
