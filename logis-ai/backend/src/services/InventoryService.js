const Inventory = require('../models/Inventory');
const Consumption = require('../models/Consumption');

class InventoryService {
    /**
     * Handle consumption recording and inventory deduction
     */
    static async consume(locationId, itemId, quantity, date, source, notes, userId) {
        // 1. Find corresponding inventory
        const inventory = await Inventory.findOne({ location: locationId, item: itemId });

        if (!inventory) {
            const error = new Error('Inventory record not found for this location and item.');
            error.statusCode = 404;
            throw error;
        }

        // 2. Verify sufficient stock (currentQuantity - reservedQuantity >= quantity)
        const available = inventory.currentQuantity - inventory.reservedQuantity;
        if (available < quantity) {
            const error = new Error('Insufficient inventory for requested consumption.');
            error.statusCode = 400;
            throw error;
        }

        // 3. Deduct consumed quantity.
        inventory.currentQuantity -= quantity;

        // 4. Save inventory.
        await inventory.save();

        // 5. Create consumption record.
        const consumption = await Consumption.create({
            location: locationId,
            item: itemId,
            quantity,
            date: date || Date.now(),
            source,
            notes,
            createdBy: userId,
        });

        return { inventory, consumption };
    }

    /**
     * Reserve stock for a shipment (transition to ready/dispatched)
     */
    static async reserveForShipment(sourceLocationId, items) {
        for (const shipmentItem of items) {
            const inventory = await Inventory.findOne({
                location: sourceLocationId,
                item: shipmentItem.item,
            });

            if (!inventory) {
                const error = new Error(`Inventory not found for item ${shipmentItem.item} at source location.`);
                error.statusCode = 404;
                throw error;
            }

            const available = inventory.currentQuantity - inventory.reservedQuantity;
            if (available < shipmentItem.quantity) {
                const error = new Error(`Insufficient inventory to reserve item ${shipmentItem.item} for shipment.`);
                error.statusCode = 400;
                throw error;
            }

            inventory.reservedQuantity += shipmentItem.quantity;
            await inventory.save();
        }
    }

    /**
     * Finalize shipment delivery - deduct reserved stock at source and increase at destination
     */
    static async finalizeShipmentDelivery(sourceLocationId, destinationLocationId, items) {
        for (const shipmentItem of items) {
            // Deduct at source
            const sourceInventory = await Inventory.findOne({
                location: sourceLocationId,
                item: shipmentItem.item,
            });

            if (sourceInventory) {
                // Remove from both reserved and current
                sourceInventory.reservedQuantity = Math.max(0, sourceInventory.reservedQuantity - shipmentItem.quantity);
                sourceInventory.currentQuantity = Math.max(0, sourceInventory.currentQuantity - shipmentItem.quantity);
                await sourceInventory.save();
            }

            // Increase at destination
            let destInventory = await Inventory.findOne({
                location: destinationLocationId,
                item: shipmentItem.item,
            });

            if (destInventory) {
                destInventory.currentQuantity += shipmentItem.quantity;
                await destInventory.save();
            } else {
                // Create new inventory record at destination if it doesn't exist
                await Inventory.create({
                    location: destinationLocationId,
                    item: shipmentItem.item,
                    currentQuantity: shipmentItem.quantity,
                    reservedQuantity: 0,
                });
            }
        }
    }

    /**
     * Cancel shipment - free up reserved stock if it was reserved
     */
    static async releaseReservedStock(sourceLocationId, items) {
        for (const shipmentItem of items) {
            const inventory = await Inventory.findOne({
                location: sourceLocationId,
                item: shipmentItem.item,
            });

            if (inventory) {
                inventory.reservedQuantity = Math.max(0, inventory.reservedQuantity - shipmentItem.quantity);
                await inventory.save();
            }
        }
    }
}

module.exports = InventoryService;
