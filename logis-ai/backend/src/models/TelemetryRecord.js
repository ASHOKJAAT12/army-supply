const mongoose = require('mongoose');

const telemetryRecordSchema = new mongoose.Schema({
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true,
        index: true
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    measurements: {
        weightKg: Number,
        temperatureC: Number,
        latitude: Number,
        longitude: Number,
        speedKmh: Number,
        heading: Number
    },
    calculatedQuantity: {
        type: Number // the converted business value based on tare and unit weight
    },
    batteryPercent: Number,
    signalStrength: Number,
    source: {
        type: String,
        enum: ['mqtt', 'http', 'simulator'],
        default: 'mqtt'
    },
    receivedAt: {
        type: Date,
        default: Date.now
    }
});

telemetryRecordSchema.index({ device: 1, timestamp: -1 });
telemetryRecordSchema.index({ location: 1, timestamp: -1 });

module.exports = mongoose.model('TelemetryRecord', telemetryRecordSchema);
