const axios = require('axios');
const geoService = require('./geoService');
const riskService = require('./riskService');
const optimizationConfig = require('../config/optimizationConfig');
const Location = require('../models/Location');
const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const OptimizationRun = require('../models/OptimizationRun');

exports.buildCostMatrix = async (nodes, weights) => {
    const size = nodes.length;
    const distanceMatrix = Array(size).fill(0).map(() => Array(size).fill(0));
    const costMatrix = Array(size).fill(0).map(() => Array(size).fill(0));

    // Simple risk evaluation for the area
    // To avoid massive N*N db calls, we will just use location risk scores as proxy for route risk
    const locationRisks = {};
    for (const node of nodes) {
        if (!locationRisks[node._id]) {
            try {
                const riskRes = await riskService.calculateRiskForLocation(node._id);
                locationRisks[node._id] = riskRes.overallScore;
            } catch (err) {
                locationRisks[node._id] = 50; // fallback moderate risk
            }
        }
    }

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (i === j) {
                costMatrix[i][j] = 0;
                distanceMatrix[i][j] = 0;
            } else {
                const source = nodes[i];
                const dest = nodes[j];

                const distKm = geoService.haversineDistance(
                    source.latitude, source.longitude,
                    dest.latitude, dest.longitude
                );
                const timeMin = geoService.estimateTravelTimeMinutes(distKm);

                // Route risk is average of source and destination
                const routeRisk = (locationRisks[source._id] + locationRisks[dest._id]) / 2;

                // Normalize for cost calculation
                const normDist = Math.min(distKm / 1000.0, 1.0) * 100;
                const normTime = Math.min(timeMin / 1000.0, 1.0) * 100;

                const d_w = weights.distanceWeight / 100;
                const t_w = weights.timeWeight / 100;
                const r_w = weights.riskWeight / 100;

                const cost = (normDist * d_w) + (normTime * t_w) + (routeRisk * r_w);

                distanceMatrix[i][j] = distKm;
                costMatrix[i][j] = cost;
            }
        }
    }

    return { distanceMatrix, costMatrix, locationRisks };
};

exports.runOptimization = async (sourceLocationId, shipmentIds, vehicleIds, objectiveWeights, userId) => {
    // 1. Fetch Source
    const sourceLoc = await Location.findById(sourceLocationId);
    if (!sourceLoc) throw new Error("Source location not found");

    // 2. Fetch Shipments
    const shipmentsDb = await Shipment.find({ _id: { $in: shipmentIds } }).populate('destination');
    if (shipmentsDb.length === 0) throw new Error("No valid shipments found");

    // 3. Fetch Vehicles
    const vehiclesDb = await Vehicle.find({ _id: { $in: vehicleIds } });
    const availableVehicles = vehiclesDb.filter(v => ['available', 'idle', 'in_transit'].includes(v.status)); // Allow simple demo logic
    if (availableVehicles.length === 0) throw new Error("No vehicles available for assignment");

    const weights = objectiveWeights || optimizationConfig.defaultWeights;

    // Nodes for Matrix: 0 is Depot (Source), 1..N are destinations corresponding to shipments
    const nodes = [sourceLoc];
    const shipmentPayloads = [];

    for (const shp of shipmentsDb) {
        nodes.push(shp.destination);

        let priorityScore = 50;
        if (shp.priority === 'critical') priorityScore = 100;
        if (shp.priority === 'high') priorityScore = 80;
        if (shp.priority === 'low') priorityScore = 20;

        shipmentPayloads.push({
            id: shp._id.toString(),
            weight: shp.itemQuantities && shp.itemQuantities.length > 0 ? shp.itemQuantities.reduce((acc, q) => acc + (q.quantity || 1), 0) * 100 : 500, // simple weight abstraction
            destinationId: shp.destination._id.toString(),
            priorityScore: priorityScore
        });
    }

    const vehiclePayloads = availableVehicles.map(v => ({
        id: v._id.toString(),
        capacity: v.capacity || 2000
    }));

    // Matrix construction
    const { distanceMatrix, costMatrix, locationRisks } = await this.buildCostMatrix(nodes, weights);

    // Python API Call
    const pythonPayload = {
        shipments: shipmentPayloads,
        vehicles: vehiclePayloads,
        distanceMatrix: distanceMatrix,
        costMatrix: costMatrix,
        weights: weights
    };

    let aiResult;
    try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
        const response = await axios.post(`${aiServiceUrl}/optimization/run`, pythonPayload);
        aiResult = response.data.data;
    } catch (error) {
        throw new Error("Optimization service unavailable.");
    }

    // Reformat AI results to include robust tracking data
    const enrichedAssignments = aiResult.vehicleAssignments.map(assignment => {
        // Find which node index this shipment is to map back to distance matrix
        const nodeIndex = shipmentPayloads.findIndex(s => s.id === assignment.shipmentId) + 1;
        const dist = distanceMatrix[0][nodeIndex]; // Distance from source to destination
        const time = geoService.estimateTravelTimeMinutes(dist);

        // Approximate route risk based on source and destination location risk
        const d_risk = locationRisks[nodes[nodeIndex]._id] || 50;
        const s_risk = locationRisks[sourceLoc._id] || 50;
        const routeRisk = (s_risk + d_risk) / 2;

        let riskLevel = 'low';
        if (routeRisk > 70) riskLevel = 'critical';
        else if (routeRisk > 40) riskLevel = 'high';
        else if (routeRisk > 20) riskLevel = 'medium';

        const shipmentObj = shipmentPayloads.find(s => s.id === assignment.shipmentId);

        return {
            ...assignment,
            routeId: `OPT-RTE-${Math.floor(Math.random() * 10000)}`,
            distanceKm: dist,
            estimatedTravelTimeMinutes: time,
            routeRiskScore: routeRisk,
            routeRiskLevel: riskLevel,
            priorityScore: shipmentObj.priorityScore
        };
    });

    // Save Run
    const optimizationId = `OPT-${Date.now()}`;
    const runRecord = await OptimizationRun.create({
        optimizationId,
        sourceLocation: sourceLocationId,
        shipmentIds: shipmentIds,
        vehicleIds: vehicleIds,
        objectiveWeights: weights,
        status: 'completed',
        result: {
            vehicleAssignments: enrichedAssignments,
            unassignedShipments: aiResult.unassignedShipments || [],
            summary: aiResult.summary || {}
        },
        createdBy: userId,
        completedAt: new Date()
    });

    return runRecord;
};
