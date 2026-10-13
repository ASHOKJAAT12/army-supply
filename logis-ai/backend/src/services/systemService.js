const Location = require('../models/Location');
const Vehicle = require('../models/Vehicle');
const Device = require('../models/Device');
const Inventory = require('../models/Inventory');

const getScorecard = async () => {
    try {
        const [locations, vehicles, devices, inventories] = await Promise.all([
            Location.find({}),
            Vehicle.find({}),
            Device.find({}),
            Inventory.find({}).populate('item location') // needed to check limits if necessary, though basic checks below
        ]);

        let issues = [];
        let score = 100;

        // Health states
        let health = {
            inventoryHealth: { status: 'healthy', value: 100 },
            forecastHealth: { status: 'healthy', value: 100 }, // Usually verified via AI microservice calls
            riskHealth: { status: 'healthy', value: 100 },
            routeHealth: { status: 'healthy', value: 100 },
            vehicleHealth: { status: 'healthy', value: 100 },
            iotHealth: { status: 'healthy', value: 100 },
            decisionHealth: { status: 'healthy', value: 100 }
        };

        // Validate Coordinates for Locations & Terrain data
        const missingCoords = locations.filter(l => !l.latitude || !l.longitude);
        if (missingCoords.length > 0) {
            score -= (missingCoords.length * 2);
            issues.push(`${missingCoords.length} locations missing GPS coordinates.`);
            health.routeHealth.status = 'warning';
        }

        // Validate Vehicle constraints
        const offlineVehicles = vehicles.filter(v => v.status === 'out_of_service');
        if (offlineVehicles.length > 0) {
            score -= (offlineVehicles.length * 1);
            if (offlineVehicles.length > (vehicles.length * 0.2)) health.vehicleHealth.status = 'warning';
        }

        // Validate IoT telemetry
        const offlineDevices = devices.filter(d => d.status === 'offline');
        if (offlineDevices.length > 0) {
            score -= (offlineDevices.length * 2);
            issues.push(`${offlineDevices.length} IoT sensors offline.`);
            health.iotHealth.status = 'warning';
        }

        // Stale Telemetry Check
        const staleDevices = devices.filter(d => {
            if (d.status !== 'online') return false;
            if (!d.lastTelemetryAt) return true;
            const age = Date.now() - new Date(d.lastTelemetryAt).getTime();
            return age > 60000; // > 1 min
        });
        if (staleDevices.length > 0) {
            score -= staleDevices.length;
            issues.push(`${staleDevices.length} IoT sensors reporting stale telemetry.`);
        }

        // Data completeness for Inventory
        const missingInventory = inventories.filter(i => i.currentQuantity == null);
        if (missingInventory.length > 0) {
            score -= (missingInventory.length * 2);
            issues.push(`${missingInventory.length} inventory records missing quantities.`);
            health.inventoryHealth.status = 'critical';
        }

        // Bound scorecard
        score = Math.max(0, Math.min(100, score));

        return {
            success: true,
            data: {
                dataQualityScore: score,
                issues,
                health
            }
        };

    } catch (err) {
        console.error('SystemScorecard build error:', err);
        return { success: false, message: 'Failed to build scorecard', error: err.message };
    }
};

module.exports = {
    getScorecard
};
