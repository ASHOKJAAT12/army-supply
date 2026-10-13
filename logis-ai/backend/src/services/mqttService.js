const mqtt = require('mqtt');
const Device = require('../models/Device');
const TelemetryRecord = require('../models/TelemetryRecord');
const DeviceEvent = require('../models/DeviceEvent');
const Inventory = require('../models/Inventory');
const Location = require('../models/Location');
const eventOrchestrator = require('./eventOrchestrator');

class MQTTService {
    constructor() {
        this.client = null;
        this.io = null; // Injected later
    }

    init(io, brokerUrl = 'mqtt://127.0.0.1:1883') {
        this.io = io;
        this.client = mqtt.connect(brokerUrl);

        this.client.on('connect', () => {
            console.log('[IoT Service] Connected to MQTT broker');
            // Global device telemetry topic
            this.client.subscribe('logis-ai/devices/+/telemetry', (err) => {
                if (err) console.error('Subscription error:', err);
            });
        });

        this.client.on('message', async (topic, message) => {
            try {
                await this.handleMessage(topic, message.toString());
            } catch (err) {
                console.error('[IoT Service] Error handling message:', err);
            }
        });
    }

    async handleMessage(topic, payloadString) {
        // e.g. logis-ai/devices/SENSOR-001/telemetry
        const parts = topic.split('/');
        if (parts.length < 4 || parts[3] !== 'telemetry') return;

        const deviceIdString = parts[2];
        let payload;
        try {
            payload = JSON.parse(payloadString);
        } catch (e) {
            console.error('[IoT Service] Malformed JSON:', payloadString);
            return;
        }

        // Validate payload device matches topic
        if (payload.deviceId && payload.deviceId !== deviceIdString) {
            console.warn('[IoT Service] Topic device ID does not match payload device ID');
            return;
        }

        const device = await Device.findOne({ deviceId: deviceIdString });
        if (!device) {
            console.warn(`[IoT Service] Received telemetry for unknown device: ${deviceIdString}`);
            return;
        }

        // Parse Standard IoT Payload
        const { timestamp, measurements, batteryPercent, signalStrength } = payload;
        const msgTime = timestamp ? new Date(timestamp) : new Date();

        // Check for anomalies (extremely simple physical bounds)
        let isAnomaly = false;
        if (device.deviceType === 'inventory_sensor' && measurements && measurements.weightKg !== undefined) {
            if (measurements.weightKg < 0 || measurements.weightKg > 10000) {
                isAnomaly = true;
                await this.logEvent(device._id, 'anomalous_reading', 'warning', `Impossible weight reading: ${measurements.weightKg}kg`);
            }
        }

        // Add Telemetry Record
        let calcQuantity = null;
        if (!isAnomaly && measurements && measurements.weightKg !== undefined && device.sensorConfig && device.sensorConfig.unitWeight) {
            const netWeight = Math.max(0, measurements.weightKg - (device.sensorConfig.tareWeight || 0));
            calcQuantity = Math.floor(netWeight / device.sensorConfig.unitWeight);
        }

        const record = await TelemetryRecord.create({
            device: device._id,
            location: device.location,
            item: device.item,
            timestamp: msgTime,
            measurements,
            calculatedQuantity: calcQuantity,
            batteryPercent,
            signalStrength,
            source: 'mqtt'
        });

        // Update Device State
        device.lastSeenAt = new Date();
        device.lastTelemetryAt = msgTime;
        device.batteryPercent = batteryPercent;
        if (device.status !== 'maintenance') {
            device.status = 'online';
        }
        await device.save();

        this.io.emit('device_status_updated', device);
        this.io.emit('telemetry_received', record);

        // Inventory processing logic if applicable
        if (calcQuantity !== null && device.item && device.location) {
            await this.processInventoryUpdate(device, calcQuantity, msgTime);
        }

        // Battery logic
        if (batteryPercent !== undefined && batteryPercent < 15) {
            await this.logEvent(device._id, 'battery_low', 'warning', `Battery critically low: ${batteryPercent}%`);
        }
    }

    async processInventoryUpdate(device, quantity, time) {
        const inventory = await Inventory.findOne({ location: device.location, item: device.item });
        if (inventory) {
            inventory.lastSensorQuantity = quantity;
            inventory.lastSensorUpdate = time;

            // Only update currentQuantity if source is IoT or Hybrid
            if (inventory.quantitySource === 'iot' || inventory.quantitySource === 'hybrid') {
                inventory.currentQuantity = quantity;
            }
            await inventory.save();

            // Thresholds
            if (quantity <= inventory.minimumStock) {
                // If it drops to critical
                const isCrit = quantity <= (inventory.minimumStock * 0.5);
                await this.logEvent(device._id, 'threshold_exceeded', isCrit ? 'critical' : 'warning', `Inventory dropped to ${quantity} units (Minimum: ${inventory.minimumStock})`);
            }

            try {
                // Broadcast Inventory Update
                if (this.io) {
                    this.io.emit('inventory_updated', {
                        inventoryId: inventory._id,
                        locationId: device.location._id || device.location,
                        itemId: device.item._id || device.item,
                        quantity: inventory.currentQuantity,
                        source: 'iot',
                        lastSensorUpdate: inventory.lastSensorUpdate,
                        status: inventory.status
                    });
                }

                // Alert the orchestrator of an inventory state change!
                eventOrchestrator.handleInventoryEvent(
                    device.location._id || device.location,
                    device.item._id || device.item,
                    inventory.currentQuantity,
                    inventory.status,
                    'iot'
                ).catch(e => console.error(e));
            } catch (invErr) {
                console.error('[IoT Service] Error updating inventory:', invErr);
            }
        }
    }

    async logEvent(deviceId, type, severity, message) {
        const event = await DeviceEvent.create({
            device: deviceId,
            alertType: type,
            severity,
            message
        });
        if (this.io) {
            this.io.emit('iot_alert_created', event);
        }
        return event;
    }
}

module.exports = new MQTTService();
