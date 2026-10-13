require('dotenv').config();
const mongoose = require('mongoose');
const Location = require('../src/models/Location');
const Item = require('../src/models/Item');
const Inventory = require('../src/models/Inventory');
const Decision = require('../src/models/Decision');
const AuditLog = require('../src/models/AuditLog');
const Notification = require('../src/models/Notification');
const Vehicle = require('../src/models/Vehicle');
const Shipment = require('../src/models/Shipment');

const run = async () => {
    if (process.env.DEMO_MODE !== 'true') {
        console.error('CRITICAL: DEMO_MODE is not enabled in environment. Aborting reset safe-guard.');
        process.exit(1);
    }

    console.log('--- STARTING LOGIS-AI DETERMINISTIC DEMO RESET ---');

    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logis-ai');
        console.log('MongoDB Connected.');

        // 1. Wipe collections explicitly
        await Decision.deleteMany({});
        await AuditLog.deleteMany({});
        await Notification.deleteMany({});
        await Location.deleteMany({});
        await Item.deleteMany({});
        await Inventory.deleteMany({});
        await Vehicle.deleteMany({});
        await Shipment.deleteMany({});
        console.log('Collections Wiped.');

        // 2. Base Locations
        const depot = await Location.create({
            name: 'Central Command Depot (HQ)',
            type: 'depot',
            latitude: 28.6139,
            longitude: 77.2090,
            status: 'active'
        });

        const outpost = await Location.create({
            name: 'Northern Forward Base (FOB-Alpha)',
            type: 'base',
            latitude: 34.1491,
            longitude: 74.3311,
            status: 'active'
        });

        // 3. Base Items
        const mremItem = await Item.create({
            name: 'MRE Rations (Standard)',
            sku: 'MRE-STD-001',
            category: 'rations',
            unit: 'pallets',
            unitWeight: 500,
            dangerLevel: 'none',
            priority: 'high'
        });

        // 4. Inventory (Setting up for a crash)
        await Inventory.create({
            locationId: outpost._id,
            itemId: mremItem._id,
            currentQuantity: 80, // Getting low
            minimumRequired: 100, // Threshold
            capacity: 500,
            quantitySource: 'iot',
            lastSensorQuantity: 80,
            status: 'warning'
        });

        // 5. Vehicles
        const vehicle = await Vehicle.create({
            registrationNumber: 'CONVOY-X99',
            type: 'truck',
            capacity: 10000,
            currentLoad: 0,
            status: 'available',
            currentLocation: depot._id
        });

        console.log('--- DEMO SCENARIO SEEDED SUCCESSFULLY ---');
        console.log(`HQ ID: ${depot._id}`);
        console.log(`FOB ID: ${outpost._id}`);
        console.log(`Vehicle ID: ${vehicle._id}`);
        process.exit(0);

    } catch (err) {
        console.error('Reset Failed:', err);
        process.exit(1);
    }
}

run();
