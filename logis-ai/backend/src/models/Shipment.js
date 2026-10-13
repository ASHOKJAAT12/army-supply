const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema(
    {
        shipmentNumber: {
            type: String,
            required: [true, 'Shipment number is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        sourceLocation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: [true, 'Source location is required'],
        },
        destinationLocation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: [true, 'Destination location is required'],
        },
        items: [
            {
                item: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Item',
                    required: [true, 'Item is required in shipment items'],
                },
                quantity: {
                    type: Number,
                    required: [true, 'Quantity is required'],
                    min: [0.0001, 'Quantity must be greater than 0'],
                },
            },
        ],
        totalWeightOrQuantity: {
            type: Number,
            min: 0,
        },
        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vehicle',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
        },
        status: {
            type: String,
            enum: ['planned', 'ready', 'dispatched', 'in_transit', 'delivered', 'cancelled'],
            default: 'planned',
        },
        dispatchDate: {
            type: Date,
        },
        estimatedArrival: {
            type: Date,
        },
        actualArrival: {
            type: Date,
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

// Business validations
shipmentSchema.pre('validate', function (next) {
    if (this.sourceLocation && this.destinationLocation) {
        if (this.sourceLocation.toString() === this.destinationLocation.toString()) {
            this.invalidate(
                'destinationLocation',
                'Source and destination cannot be the same.'
            );
        }
    }

    if (this.status === 'delivered' && !this.actualArrival) {
        this.invalidate(
            'actualArrival',
            'Delivered shipment must have actualArrival date.'
        );
    }

    next();
});

shipmentSchema.index({ status: 1, priority: -1 });
shipmentSchema.index({ sourceLocation: 1 });
shipmentSchema.index({ destinationLocation: 1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
