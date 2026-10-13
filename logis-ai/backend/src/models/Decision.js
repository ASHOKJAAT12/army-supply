const mongoose = require('mongoose');

const decisionSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['draft', 'recommended', 'review_required', 'approved', 'applied', 'rejected', 'expired', 'stale', 'failed'],
        default: 'draft'
    },
    trigger: {
        type: String,
        required: true
    },
    urgencyScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    confidenceScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    objective: {
        type: String,
        required: true
    },
    affectedLocations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    }],
    affectedInventory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory'
    }],
    affectedShipments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shipment'
    }],
    affectedVehicles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    }],
    recommendations: [{
        action: String,
        description: String,
        tradeOffs: String
    }],
    selectedPlan: {
        type: mongoose.Schema.Types.Mixed
        // e.g { distanceKm, estimatedTravelTimeMinutes, riskScore, riskLevel, vehicleAssignments }
    },
    alternativePlans: [{
        type: mongoose.Schema.Types.Mixed
    }],
    reasons: [{
        type: String
    }],
    assumptions: [{
        type: String
    }],
    dataSources: {
        type: mongoose.Schema.Types.Mixed
        // Data freshness objects { inventory: { timestamp, age, status }, forecast: ... }
    },
    versions: {
        forecast: String,
        risk: String,
        optimization: String,
        decisionEngine: String
    },
    createdBy: {
        type: String, // system or userId
        default: 'system'
    },
    appliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    appliedAt: {
        type: Date
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: {
        type: Date
    },
    rejectionReason: {
        type: String
    },
    expiresAt: {
        type: Date
    }
}, {
    timestamps: true
});

decisionSchema.index({ status: 1, urgencyScore: -1 });
decisionSchema.index({ affectedLocations: 1 });
decisionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Decision', decisionSchema);
