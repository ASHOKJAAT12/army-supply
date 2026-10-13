const mongoose = require('mongoose');

const riskAssessmentSchema = new mongoose.Schema(
    {
        entityType: {
            type: String,
            enum: ['location', 'inventory', 'shipment', 'route'],
            required: [true, 'Entity type is required'],
        },
        entityId: {
            // Can be Location, Inventory, or Shipment ID.
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Entity ID is required'],
        },
        location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
        },
        shipment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shipment',
        },
        inventory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Inventory',
        },
        route: {
            // Phase 3 route doesn't have an ID necessarily, but we could refer to a shipment or location pair
            type: Object, // Or could be a reference if they store Routes as a model
        },
        overallScore: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
        },
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            required: true,
        },
        componentScores: {
            inventory: { type: Number, min: 0, max: 100 },
            forecast: { type: Number, min: 0, max: 100 },
            weather: { type: Number, min: 0, max: 100 },
            terrain: { type: Number, min: 0, max: 100 },
            route: { type: Number, min: 0, max: 100 },
            transport: { type: Number, min: 0, max: 100 },
            anomaly: { type: Number, min: 0, max: 100 },
            priority: { type: Number, min: 0, max: 100 },
        },
        factors: [
            {
                type: String,
            },
        ],
        recommendations: [
            {
                type: String,
            },
        ],
        confidence: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        confidenceReason: {
            type: String, // Reason for confidence level
        },
        generatedAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
        },
        sourceVersion: {
            type: String,
            default: '1.0',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
riskAssessmentSchema.index({ entityType: 1, entityId: 1 });
riskAssessmentSchema.index({ location: 1 });
riskAssessmentSchema.index({ shipment: 1 });
riskAssessmentSchema.index({ riskLevel: 1 });
riskAssessmentSchema.index({ generatedAt: -1 });

module.exports = mongoose.model('RiskAssessment', riskAssessmentSchema);
