const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    entity: {
        type: String,
        required: true // e.g., 'Decision', 'Shipment', 'Vehicle'
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },
    oldValue: {
        type: mongoose.Schema.Types.Mixed
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed
    },
    reason: {
        type: String
    },
    sourceDecisionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Decision'
    }
}, {
    timestamps: true // adds createdAt for timestamp
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
