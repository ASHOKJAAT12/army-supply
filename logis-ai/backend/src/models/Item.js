const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Item code is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        category: {
            type: String,
            enum: ['food', 'medical', 'fuel', 'equipment', 'general'],
            required: [true, 'Category is required'],
        },
        unit: {
            type: String,
            required: [true, 'Unit of measurement is required'],
            trim: true,
        },
        minimumStock: {
            type: Number,
            default: 0,
            min: 0,
        },
        maximumStock: {
            type: Number,
            default: 1000,
            min: 0,
        },
        description: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Item', itemSchema);
