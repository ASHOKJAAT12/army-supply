const mongoose = require('mongoose');

const forecastSchema = new mongoose.Schema({
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true
    },
    horizonDays: {
        type: Number,
        default: 7
    },
    forecastData: [{
        date: { type: Date, required: true },
        predictedDemand: { type: Number, required: true },
        projectedStock: { type: Number, required: true }
    }],
    stockStatus: {
        type: String,
        enum: ['normal', 'warning', 'critical', 'stockout_risk', 'insufficient_data'],
        default: 'normal'
    },
    predictedStockoutDate: {
        type: Date,
        default: null
    },
    recommendedReplenishment: {
        type: Number,
        default: 0
    },
    confidenceLevel: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    confidenceScore: {
        type: Number, // Optional metric mapped from MAE / Dataset size
        default: null
    },
    modelUsed: {
        type: String,
        required: true
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for fast retrieval
forecastSchema.index({ location: 1, item: 1 });
forecastSchema.index({ stockStatus: 1 });
forecastSchema.index({ 'forecastData.date': 1 }); // For timeline queries

module.exports = mongoose.model('Forecast', forecastSchema);
