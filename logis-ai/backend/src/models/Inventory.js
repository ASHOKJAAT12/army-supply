const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
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
        currentQuantity: {
            type: Number,
            required: [true, 'Current quantity is required'],
            min: [0, 'Quantity cannot be negative'],
        },
        quantitySource: {
            type: String,
            enum: ['manual', 'iot', 'hybrid'],
            default: 'manual',
        },
        lastSensorQuantity: {
            type: Number,
        },
        lastSensorUpdate: {
            type: Date,
        },
        reservedQuantity: {
            type: Number,
            default: 0,
            min: [0, 'Reserved quantity cannot be negative'],
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
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Compound unique index to prevent duplicate inventory records for the same location + item
inventorySchema.index({ location: 1, item: 1 }, { unique: true });

// Prevent reserved from exceeding current
inventorySchema.pre('save', function (next) {
    if (this.reservedQuantity > this.currentQuantity) {
        return next(
            new Error(
                'Validation Error: Reserved quantity cannot exceed current quantity.'
            )
        );
    }
    this.lastUpdated = Date.now();
    next();
});

// Virtual for available quantity
inventorySchema.virtual('availableQuantity').get(function () {
    return this.currentQuantity - this.reservedQuantity;
});

// Virtual for stock status
inventorySchema.virtual('status').get(function () {
    if (this.currentQuantity <= this.minimumStock) {
        return 'critical';
    } else if (this.currentQuantity <= 1.5 * this.minimumStock) {
        return 'low';
    } else {
        return 'normal';
    }
});

module.exports = mongoose.model('Inventory', inventorySchema);
