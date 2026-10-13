const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true // e.g. 'critical_decision', 'high_risk', 'iot_alert'
    },
    message: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        default: 'medium'
    },
    read: {
        type: Boolean,
        default: false
    },
    entityType: {
        type: String // e.g. 'Decision', 'Location'
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },
    deduplicationKey: {
        type: String, // to prevent notification spam
        index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
