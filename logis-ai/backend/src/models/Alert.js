const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
    {
        alertType: {
            type: String,
            enum: ['actual', 'predictive', 'system'],
            required: [true, 'Alert type is required'],
        },
        severity: {
            type: String,
            enum: ['info', 'warning', 'high', 'critical'],
            required: [true, 'Severity is required'],
        },
        source: {
            type: String,
            enum: ['inventory', 'weather', 'shipment', 'forecast', 'anomaly', 'system'],
            required: [true, 'Source is required'],
        },
        entity: {
            type: mongoose.Schema.Types.ObjectId,
            required: false, // Refers to location, inventory, or shipment ID
        },
        entityType: {
            type: String,
            enum: ['Location', 'Inventory', 'Shipment', 'User', 'System'],
            required: false,
        },
        message: {
            type: String,
            required: [true, 'Alert message is required'],
        },
        acknowledged: {
            type: Boolean,
            default: false,
        },
        acknowledgedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        expiresAt: {
            type: Date, // For predictive alerts, after which they are stale
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
alertSchema.index({ severity: 1 });
alertSchema.index({ acknowledged: 1 });
alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
