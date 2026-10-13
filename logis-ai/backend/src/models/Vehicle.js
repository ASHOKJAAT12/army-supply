const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
    {
        vehicleNumber: {
            type: String,
            required: [true, 'Vehicle number is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        vehicleType: {
            type: String,
            enum: ['truck', 'van', 'utility'],
            required: [true, 'Vehicle type is required'],
        },
        capacity: {
            type: Number,
            min: [0, 'Capacity cannot be negative'],
        },
        capacityUnit: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['available', 'assigned', 'in_transit', 'maintenance', 'inactive'],
            default: 'available',
        },
        currentLocation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
        },
        currentGeoPoint: {
            type: {
                type: String,
                enum: ['Point'],
                required: false,
            },
            coordinates: {
                type: [Number],
                required: false, // [longitude, latitude]
            },
        },
        assignedShipment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shipment',
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

vehicleSchema.pre('save', function (next) {
    this.lastUpdated = Date.now();
    next();
});

// Index for geospatial queries
vehicleSchema.index({ currentGeoPoint: '2dsphere' });

module.exports = mongoose.model('Vehicle', vehicleSchema);
