const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Location name is required'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Location code is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        type: {
            type: String,
            enum: ['warehouse', 'depot', 'forward_location'],
            required: [true, 'Location type is required'],
        },
        latitude: {
            type: Number,
            min: [-90, 'Latitude cannot be less than -90'],
            max: [90, 'Latitude cannot be greater than 90'],
        },
        longitude: {
            type: Number,
            min: [-180, 'Longitude cannot be less than -180'],
            max: [180, 'Longitude cannot be greater than 180'],
        },
        terrainType: {
            type: String,
            trim: true,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        description: {
            type: String,
            trim: true,
        },
        // Location polygon data (GeoJSON) - optional for zones
        boundary: {
            type: { type: String, enum: ['Polygon'], default: 'Polygon' },
            coordinates: { type: [[[Number]]], default: undefined } // Array of coordinate arrays
        },
    },
    {
        timestamps: true,
    }
);

// Add MongoDB Database Indexes for faster queries
locationSchema.index({ name: 1 });
locationSchema.index({ type: 1 });
locationSchema.index({ status: 1 });

module.exports = mongoose.model('Location', locationSchema);
