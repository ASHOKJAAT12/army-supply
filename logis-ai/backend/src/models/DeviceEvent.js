const mongoose = require('mongoose');

const deviceEventSchema = new mongoose.Schema({
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true,
        index: true
    },
    alertType: {
        type: String,
        enum: ['threshold_exceeded', 'sensor_failure', 'battery_low', 'device_offline', 'anomalous_reading', 'calibration_required', 'restored'],
        required: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'high', 'critical'],
        required: true
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    },
    message: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    acknowledged: {
        type: Boolean,
        default: false
    },
    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    acknowledgedAt: {
        type: Date
    }
});

deviceEventSchema.index({ acknowledged: 1, severity: 1 });

module.exports = mongoose.model('DeviceEvent', deviceEventSchema);
