const mongoose = require('mongoose');

const optimizationRunSchema = new mongoose.Schema({
    optimizationId: {
        type: String,
        required: true,
        unique: true
    },
    sourceLocation: {
        type: mongoose.Schema.ObjectId,
        ref: 'Location',
        required: true
    },
    shipmentIds: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Shipment'
    }],
    vehicleIds: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Vehicle'
    }],
    objectiveWeights: {
        distanceWeight: { type: Number, default: 20 },
        timeWeight: { type: Number, default: 20 },
        riskWeight: { type: Number, default: 25 },
        delayWeight: { type: Number, default: 20 },
        efficiencyWeight: { type: Number, default: 5 },
        priorityWeight: { type: Number, default: 10 }
    },
    status: {
        type: String,
        enum: ['queued', 'running', 'completed', 'failed', 'cancelled', 'stale', 'applied'],
        default: 'queued'
    },
    result: {
        vehicleAssignments: [{
            shipmentId: { type: mongoose.Schema.ObjectId, ref: 'Shipment' },
            vehicleId: { type: mongoose.Schema.ObjectId, ref: 'Vehicle' },
            routeId: String,
            sequence: Number,
            distanceKm: Number,
            estimatedTravelTimeMinutes: Number,
            routeRiskScore: Number,
            routeRiskLevel: String,
            vehicleUtilization: Number,
            priorityScore: Number,
            explanation: {
                vehicleReason: String,
                routeReason: String,
                priorityReason: String
            }
        }],
        unassignedShipments: [{
            shipmentId: { type: mongoose.Schema.ObjectId, ref: 'Shipment' },
            reason: String
        }],
        summary: {
            totalCostCalculated: Number,
            totalVehiclesUsed: Number
        }
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    completedAt: Date,
    modelVersion: {
        type: String,
        default: 'v1.0'
    },
    assumptions: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('OptimizationRun', optimizationRunSchema);
