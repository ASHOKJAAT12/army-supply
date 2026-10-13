const mongoose = require('mongoose');

const consumptionSchema = new mongoose.Schema(
    {
        location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: [true, 'Location is required'],
        },
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: [true, 'Item is required'],
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [0.0001, 'Quantity must be greater than 0'],
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
            default: Date.now,
        },
        source: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator is required'],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Consumption', consumptionSchema);
