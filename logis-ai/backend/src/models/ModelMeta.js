const mongoose = require('mongoose');

const modelMetaSchema = new mongoose.Schema({
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
    modelType: {
        type: String,
        required: true
    },
    trainingSamples: {
        type: Number,
        default: 0
    },
    mae: { type: Number },
    rmse: { type: Number },
    status: {
        type: String,
        enum: ['ready', 'insufficient_data', 'training', 'error'],
        default: 'ready'
    },
    featureImportance: {
        type: mongoose.Schema.Types.Mixed
    },
    lastTrainedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Avoid duplicates
modelMetaSchema.index({ location: 1, item: 1 }, { unique: true });

module.exports = mongoose.model('ModelMeta', modelMetaSchema);
