const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: [true, 'Device ID is required'],
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Device name is required']
    },
    deviceType: {
        type: String,
        enum: ['inventory_sensor', 'temperature_sensor', 'tracking_device', 'gateway', 'simulator'],
        required: [true, 'Device type is required']
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'warning', 'maintenance', 'inactive'],
        default: 'inactive'
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    },
    protocol: {
        type: String,
        enum: ['mqtt', 'http'],
        default: 'mqtt'
    },
    firmwareVersion: {
        type: String,
        default: '1.0.0'
    },
    batteryPercent: {
        type: Number,
        min: 0,
        max: 100
    },
    lastSeenAt: {
        type: Date
    },
    lastTelemetryAt: {
        type: Date
    },
    thresholds: {
        minimumQuantity: { type: Number },
        criticalQuantity: { type: Number },
        temperatureMax: { type: Number },
        temperatureMin: { type: Number }
    },
    sensorConfig: {
        measurementType: {
            type: String,
            enum: ['weight', 'count', 'volume', 'temperature']
        },
        tareWeight: { type: Number, default: 0 },
        unitWeight: { type: Number, default: 1 } // To convert raw weight into units
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
