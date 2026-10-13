const process = require('process');
const mqtt = require('mqtt');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: '../.env' });

const Device = require('../src/models/Device');
const Inventory = require('../src/models/Inventory');

// Ensure MongoDB connects to read devices to simulate
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logis-ai', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('[SIM] Connected to MongoDB'));

const client = mqtt.connect('mqtt://127.0.0.1:1883');

client.on('connect', async () => {
    console.log('[SIM] Connected to MQTT broker');

    // Seed Demo Devices if missing
    let devices = await Device.find({ deviceType: 'inventory_sensor' });
    if (devices.length === 0) {
        console.log('[SIM] No devices found, waiting for DB population...');
    }

    // Every 5 seconds, simulate a reading
    setInterval(async () => {
        const activeSensors = await Device.find({ deviceType: 'inventory_sensor' });
        for (const device of activeSensors) {

            // Randomly decrease weight to simulate consumption, occasional noise
            // Base tare weight is assumed 20kg. Random payload weight up to 1000kg.
            const noise = (Math.random() * 2) - 1;

            const payload = {
                deviceId: device.deviceId,
                timestamp: new Date().toISOString(),
                measurements: {
                    weightKg: Math.floor(Math.random() * 800) + 20 + noise,
                    temperatureC: 22 + (Math.random() * 5)
                },
                batteryPercent: Math.floor(Math.random() * 20) + 80,
                signalStrength: -60 + Math.floor(Math.random() * 10)
            };

            const topic = `logis-ai/devices/${device.deviceId}/telemetry`;
            client.publish(topic, JSON.stringify(payload));
            console.log(`[SIM] Published to ${topic}`, payload.measurements);
        }
    }, 5000);
});
