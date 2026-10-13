require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Location = require('../src/models/Location');
const Item = require('../src/models/Item');
const Inventory = require('../src/models/Inventory');
const Consumption = require('../src/models/Consumption');
const Vehicle = require('../src/models/Vehicle');
const Shipment = require('../src/models/Shipment');

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/logis-ai');
        console.log('MongoDB connected for Seeding');

        // Clear existing demo logic data but preserve Users if exist, or clear them and recreate
        await Location.deleteMany();
        await Item.deleteMany();
        await Inventory.deleteMany();
        await Consumption.deleteMany();
        await Vehicle.deleteMany();
        await Shipment.deleteMany();
        await User.deleteMany(); // Resetting users for fresh phase 1 test

        // 1. Create Users
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@logisai.com',
            mobile: '1234567890',
            password: 'password123',
            role: 'admin',
        });

        const operator = await User.create({
            name: 'Operator User',
            email: 'operator@logisai.com',
            mobile: '1234567891',
            password: 'password123',
            role: 'operator',
        });

        const viewer = await User.create({
            name: 'Viewer User',
            email: 'viewer@logisai.com',
            mobile: '1234567892',
            password: 'password123',
            role: 'viewer',
        });

        console.log('Users created (Passwords: password123)');

        // 2. Create Locations
        const locationsToInsert = [
            { name: 'Central Warehouse', code: 'CW-01', type: 'warehouse', latitude: 34.05, longitude: -118.24, priority: 'medium', status: 'active' },
            { name: 'North Depot', code: 'ND-02', type: 'depot', latitude: 36.16, longitude: -115.13, priority: 'high', status: 'active' },
            { name: 'East Depot', code: 'ED-03', type: 'depot', latitude: 39.73, longitude: -104.99, priority: 'medium', status: 'active' },
            { name: 'Forward Base Alpha', code: 'FBA-01', type: 'forward_location', latitude: 32.71, longitude: -117.16, priority: 'critical', status: 'active' },
            { name: 'Forward Base Bravo', code: 'FBB-02', type: 'forward_location', latitude: 33.44, longitude: -112.07, priority: 'high', status: 'active' },
            { name: 'Forward Base Charlie', code: 'FBC-03', type: 'forward_location', latitude: 35.08, longitude: -106.65, priority: 'low', status: 'inactive' },
        ];
        const locations = await Location.insertMany(locationsToInsert);
        console.log('Locations created');

        // 3. Create Items
        const itemsToInsert = [
            { name: 'Food Supply A', code: 'FOOD-A', category: 'food', unit: 'boxes', minimumStock: 100, maximumStock: 2000 },
            { name: 'Medical Supply B', code: 'MED-B', category: 'medical', unit: 'boxes', minimumStock: 50, maximumStock: 500 },
            { name: 'Fuel Supply C', code: 'FUEL-C', category: 'fuel', unit: 'liters', minimumStock: 1000, maximumStock: 10000 },
            { name: 'Equipment Supply D', code: 'EQ-D', category: 'equipment', unit: 'units', minimumStock: 20, maximumStock: 200 },
            { name: 'General Supply E', code: 'GEN-E', category: 'general', unit: 'units', minimumStock: 200, maximumStock: 1000 },
        ];
        const items = await Item.insertMany(itemsToInsert);
        console.log('Items created');

        // 4. Create Vehicles
        const vehiclesToInsert = [
            { vehicleNumber: 'TRK-001', vehicleType: 'truck', capacity: 5000, capacityUnit: 'kg', status: 'available', currentLocation: locations[0]._id },
            { vehicleNumber: 'TRK-002', vehicleType: 'truck', capacity: 5000, capacityUnit: 'kg', status: 'assigned', currentLocation: locations[0]._id },
            { vehicleNumber: 'TRK-003', vehicleType: 'utility', capacity: 1000, capacityUnit: 'kg', status: 'in_transit', currentLocation: locations[1]._id },
            { vehicleNumber: 'TRK-004', vehicleType: 'van', capacity: 2000, capacityUnit: 'kg', status: 'maintenance' },
            { vehicleNumber: 'TRK-005', vehicleType: 'truck', capacity: 6000, capacityUnit: 'kg', status: 'available', currentLocation: locations[2]._id },
        ];
        const vehicles = await Vehicle.insertMany(vehiclesToInsert);
        console.log('Vehicles created');

        // 5. Create Inventory (mixed statuses)
        const inventoriesToInsert = [
            // Normal
            { location: locations[0]._id, item: items[0]._id, currentQuantity: 1000, reservedQuantity: 0, minimumStock: 100, maximumStock: 2000 },
            { location: locations[0]._id, item: items[1]._id, currentQuantity: 400, reservedQuantity: 50, minimumStock: 50, maximumStock: 500 },
            { location: locations[0]._id, item: items[2]._id, currentQuantity: 8000, reservedQuantity: 1000, minimumStock: 1000, maximumStock: 10000 },
            { location: locations[1]._id, item: items[0]._id, currentQuantity: 500, reservedQuantity: 0, minimumStock: 100, maximumStock: 2000 },
            { location: locations[1]._id, item: items[2]._id, currentQuantity: 5000, reservedQuantity: 0, minimumStock: 1000, maximumStock: 10000 },
            { location: locations[2]._id, item: items[3]._id, currentQuantity: 150, reservedQuantity: 10, minimumStock: 20, maximumStock: 200 },
            { location: locations[3]._id, item: items[4]._id, currentQuantity: 800, reservedQuantity: 0, minimumStock: 200, maximumStock: 1000 },
            { location: locations[4]._id, item: items[4]._id, currentQuantity: 600, reservedQuantity: 0, minimumStock: 200, maximumStock: 1000 },
            // Low (<= 1.5 * min)
            { location: locations[3]._id, item: items[0]._id, currentQuantity: 120, reservedQuantity: 0, minimumStock: 100, maximumStock: 2000 },
            { location: locations[3]._id, item: items[1]._id, currentQuantity: 60, reservedQuantity: 0, minimumStock: 50, maximumStock: 500 },
            { location: locations[4]._id, item: items[2]._id, currentQuantity: 1200, reservedQuantity: 0, minimumStock: 1000, maximumStock: 10000 },
            { location: locations[4]._id, item: items[3]._id, currentQuantity: 25, reservedQuantity: 0, minimumStock: 20, maximumStock: 200 },
            // Critical
            { location: locations[2]._id, item: items[1]._id, currentQuantity: 40, reservedQuantity: 0, minimumStock: 50, maximumStock: 500 },
            { location: locations[3]._id, item: items[2]._id, currentQuantity: 800, reservedQuantity: 0, minimumStock: 1000, maximumStock: 10000 },
            { location: locations[4]._id, item: items[0]._id, currentQuantity: 90, reservedQuantity: 0, minimumStock: 100, maximumStock: 2000 },
        ];
        const inventory = await Inventory.insertMany(inventoriesToInsert);
        console.log(`Created ${inventory.length} inventory records (Normal, Low, and Critical)`);

        // 6. Create Consumption (15 records)
        const consumptions = [];
        for (let i = 0; i < 15; i++) {
            consumptions.push({
                location: locations[i % 4]._id,
                item: items[i % 5]._id,
                quantity: Math.floor(Math.random() * 20) + 1,
                date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
                source: 'Operations ' + i,
                createdBy: operator._id
            });
        }
        await Consumption.insertMany(consumptions);
        console.log('15 Consumption records created');

        // 7. Create Shipments (mixed statuses)
        const shipmentsToInsert = [
            {
                shipmentNumber: 'SHP-1001', sourceLocation: locations[0]._id, destinationLocation: locations[3]._id,
                items: [{ item: items[0]._id, quantity: 50 }], vehicle: vehicles[0]._id, priority: 'high', status: 'planned', createdBy: admin._id
            },
            {
                shipmentNumber: 'SHP-1002', sourceLocation: locations[0]._id, destinationLocation: locations[4]._id,
                items: [{ item: items[1]._id, quantity: 20 }], vehicle: vehicles[1]._id, priority: 'critical', status: 'ready', createdBy: admin._id
            },
            {
                shipmentNumber: 'SHP-1003', sourceLocation: locations[1]._id, destinationLocation: locations[3]._id,
                items: [{ item: items[2]._id, quantity: 500 }], vehicle: vehicles[2]._id, priority: 'high', status: 'in_transit', createdBy: admin._id, dispatchDate: Date.now()
            },
            {
                shipmentNumber: 'SHP-1004', sourceLocation: locations[2]._id, destinationLocation: locations[4]._id,
                items: [{ item: items[3]._id, quantity: 5 }], vehicle: vehicles[4]._id, priority: 'medium', status: 'delivered', createdBy: admin._id, dispatchDate: Date.now() - 86400000, actualArrival: Date.now()
            },
            {
                shipmentNumber: 'SHP-1005', sourceLocation: locations[1]._id, destinationLocation: locations[4]._id,
                items: [{ item: items[4]._id, quantity: 100 }], priority: 'low', status: 'planned', createdBy: admin._id
            }
        ];
        await Shipment.insertMany(shipmentsToInsert);
        console.log('5 Shipments created');

        console.log('Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Seeding completely failed', error);
        process.exit(1);
    }
}

seedData();
