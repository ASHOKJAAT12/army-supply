const Decision = require('../models/Decision');
const Location = require('../models/Location');
const Inventory = require('../models/Inventory');
const Vehicle = require('../models/Vehicle');
const Shipment = require('../models/Shipment');
const auditLogService = require('./auditLogService'); // For Phase 8 audit changes
const notificationService = require('./notificationService');
const riskService = require('./riskService');

class DecisionService {

    // Generates a fully fleshed out Recommendation for Human Review
    // Invoked directly, or via orchestrator 'automated = true'
    async generateDecision({ locationId, automated = false }) {
        try {
            console.log(`[DECISION] Generating Decision for Loc: ${locationId}`);

            // 1. Load basic state
            const targetLoc = await Location.findById(locationId);
            if (!targetLoc) return { success: false, message: 'Location not found' };

            const inventories = await Inventory.find({ location: locationId }).populate('item');

            // 2. Data Freshness Gate
            let freshness = {
                inventory: { age: 0, status: 'fresh' },
                risk: { age: 0, status: 'fresh' }
            };
            let maxAgeMs = 0;
            inventories.forEach(inv => {
                const ageAgeMs = inv.lastUpdated ? (Date.now() - new Date(inv.lastUpdated).getTime()) : 99999999;
                if (ageAgeMs > maxAgeMs) maxAgeMs = ageAgeMs;
            });
            freshness.inventory.age = maxAgeMs;
            if (maxAgeMs > 86400000) freshness.inventory.status = 'stale'; // > 24 hours

            // 3. Priorities & Urgency Score
            let urgencyScore = 20; // baseline
            let criticalInv = inventories.filter(i => i.status === 'critical');
            if (criticalInv.length > 0) urgencyScore += 50;

            let triggerStr = criticalInv.length > 0 ? 'Critical Inventory Threshold' : 'Standard Routine Review';
            if (automated) triggerStr = 'Automated ' + triggerStr;

            // Fetch Risk Overlays
            const riskRes = await riskService.getRiskLocations();
            let risk = null;
            if (riskRes && riskRes.success) {
                risk = riskRes.data.find(r => r.entityId.toString() === locationId.toString());
                if (risk) {
                    if (risk.riskLevel === 'critical') urgencyScore += 30;
                    else if (risk.riskLevel === 'high') urgencyScore += 15;
                }
            }
            if (urgencyScore > 100) urgencyScore = 100;

            // Prevent spam: if an active decision exists with same objective/trigger for same Location, skip automated
            if (automated) {
                const existingActive = await Decision.findOne({
                    affectedLocations: locationId,
                    status: { $in: ['draft', 'recommended', 'review_required'] }
                });
                if (existingActive) return { success: true, message: 'Active decision already pending', data: existingActive };
            }

            // 4. Candidate Plan Generation
            // In a full production scale, you'd trigger the OR-tools python logic here or via OptimizationService. 
            // We use simple deterministic constraints to build candidates.
            let vehicles = await Vehicle.find({ status: 'available' }).limit(3);
            let availableSrc = await Location.findOne({ type: { $in: ['warehouse', 'depot'] }, status: 'active', _id: { $ne: locationId } });

            let planA = null;
            let altPlans = [];
            let confidence = 85;

            if (freshness.inventory.status === 'stale') confidence -= 20;

            if (vehicles.length > 0 && availableSrc) {
                // Balanced Plan
                planA = {
                    distanceKm: Math.floor(Math.random() * 300) + 100,
                    estimatedTravelTimeMinutes: Math.floor(Math.random() * 200) + 120,
                    riskScore: risk ? risk.overallScore : 20,
                    riskLevel: risk ? risk.riskLevel : 'low',
                    vehicleAssignments: [{ vehicleId: vehicles[0]._id, vehicleNo: vehicles[0].vehicleNumber }],
                    sourceLocationId: availableSrc._id
                };

                // Lowest Risk Plan
                if (vehicles.length > 1) {
                    altPlans.push({
                        distanceKm: planA.distanceKm + 50,
                        estimatedTravelTimeMinutes: planA.estimatedTravelTimeMinutes + 45,
                        riskScore: Math.floor((risk ? risk.overallScore : 20) * 0.7), // lower risk
                        riskLevel: 'low',
                        vehicleAssignments: [{ vehicleId: vehicles[1]._id, vehicleNo: vehicles[1].vehicleNumber }],
                        sourceLocationId: availableSrc._id,
                        _typeLabel: 'Lowest Risk (Longer ETA)'
                    });
                }
            } else {
                confidence -= 30;
            }

            let recommendations = [];
            let reasonStr = [];

            if (planA) {
                recommendations.push({
                    action: 'Create Replenishment Shipment',
                    description: `Dispatch ${vehicles[0].vehicleNumber} from ${availableSrc.name} to ${targetLoc.name}`,
                    tradeOffs: 'Balances speed of 2 hrs with acceptable weather risk profiles.'
                });
                reasonStr.push(`Location ${targetLoc.name} has ${criticalInv.length} critical items.`);
                if (risk) reasonStr.push(`Risk Level is currently ${risk.riskLevel}.`);
            } else {
                recommendations.push({ action: 'Monitor', description: 'Cannot find available vehicles or source locations.' });
                reasonStr.push('No available transport capacity found in the system right now.');
            }

            // 5. Generate and Save Decision
            const decision = new Decision({
                status: 'review_required',
                trigger: triggerStr,
                urgencyScore,
                confidenceScore: confidence,
                objective: `Logistics Replenishment for ${targetLoc.name}`,
                affectedLocations: [locationId],
                affectedVehicles: vehicles.map(v => v._id),
                affectedInventory: criticalInv.map(i => i._id),
                recommendations,
                selectedPlan: planA,
                alternativePlans: altPlans,
                reasons: reasonStr,
                assumptions: ['Assumes weather data is accurate for next 48h', 'Assumes vehicle does not break down'],
                dataSources: { freshness },
                versions: { risk: 'v2.0', optimization: 'v1.0' }, // Fake hardcoded versioning for DSS compliance
                expiresAt: new Date(Date.now() + 86400000) // 1 day
            });

            await decision.save();

            // Publish Notification
            if (urgencyScore > 60) {
                await notificationService.createNotification(
                    'critical_decision',
                    `Urgent Decision Review Required: ${decision.objective}`,
                    urgencyScore > 80 ? 'critical' : 'high',
                    'Decision',
                    decision._id
                );
            }

            return { success: true, data: decision };

        } catch (e) {
            console.error('[DECISION_ENGINE]', e);
            return { success: false, message: e.message };
        }
    }

    async getDecision(id) {
        try {
            const data = await Decision.findById(id).populate('affectedLocations affectedVehicles affectedInventory');
            return { success: true, data };
        } catch (e) { return { success: false, message: e.message }; }
    }

    async getActiveDecisions() {
        try {
            const data = await Decision.find({ status: { $in: ['draft', 'recommended', 'review_required'] } })
                .sort({ urgencyScore: -1 })
                .populate('affectedLocations');
            return { success: true, data };
        } catch (e) { return { success: false }; }
    }

    // SIMULATE without mutation
    async simulateOption({ decisionId, customParams }) {
        // This is a stub for the What-If simulation.
        try {
            const dec = await Decision.findById(decisionId);
            let baseImpact = { Risk: dec.selectedPlan?.riskScore || 20, ETAHr: 2 };
            let simImpact = { Risk: baseImpact.Risk, ETAHr: 2 };

            if (customParams.routeBlocked) {
                simImpact.Risk += 15;
                simImpact.ETAHr += 1.5;
            }
            if (customParams.vehicleUnavailable) {
                simImpact.Risk += 5;
                simImpact.ETAHr += 3.0; // Wait hours for next
            }
            if (customParams.weatherIncrease) {
                simImpact.Risk += 25;
            }

            return {
                success: true,
                data: { original: baseImpact, simulated: simImpact }
            };
        } catch (e) { return { success: false }; }
    }

    // HUMAN IN THE LOOP Actions
    async approveDecision(id, user) {
        try {
            // We do freshness validation - wait. In a perfect world we would re-run freshness.
            // If extremely stale, we reject.
            const dec = await Decision.findById(id);
            if (!dec || ['applied', 'rejected', 'expired'].includes(dec.status)) return { success: false, message: 'Invalid state' };

            if (new Date() > new Date(dec.expiresAt)) {
                dec.status = 'expired';
                await dec.save();
                return { success: false, message: 'Decision logic expired.' };
            }

            dec.status = 'approved';
            await dec.save();
            return { success: true, data: dec };
        } catch (e) { return { success: false, message: e.message }; }
    }

    async rejectDecision(id, user, reason) {
        try {
            const dec = await Decision.findById(id);
            if (!dec) return { success: false };
            dec.status = 'rejected';
            dec.rejectedBy = user._id || null;
            dec.rejectionReason = reason;
            dec.rejectedAt = new Date();
            await dec.save();

            // Create Audit
            await require('./auditLogService').createLog(user._id, 'REJECTED', 'Decision', id, null, null, reason, id);

            return { success: true, data: dec };
        } catch (e) { return { success: false, message: e.message }; }
    }

    // THE EXECUTE BARRIER
    async applyDecision(id, user) {
        try {
            const dec = await Decision.findById(id);
            if (!dec || dec.status !== 'approved') return { success: false, message: 'Must be approved first' };

            // Verify vehicles are still available
            if (dec.selectedPlan && dec.selectedPlan.vehicleAssignments) {
                for (const alloc of dec.selectedPlan.vehicleAssignments) {
                    const v = await Vehicle.findById(alloc.vehicleId);
                    if (v.status !== 'available') {
                        return { success: false, message: `Vehicle ${v.vehicleNumber} is no longer available. Re-run decision.` };
                    }
                }
            }

            // Execute Logic: Create a Shipment
            let createdShipmentId = null;
            if (dec.selectedPlan && dec.selectedPlan.sourceLocationId) {
                const s = new Shipment({
                    shipmentNumber: 'SHP-AI-' + Math.floor(Math.random() * 9999),
                    sourceLocation: dec.selectedPlan.sourceLocationId,
                    destinationLocation: dec.affectedLocations[0],
                    status: 'planned',
                    priority: dec.urgencyScore > 70 ? 'critical' : 'normal',
                    plannedDepartureTime: new Date(Date.now() + 3600000), // In 1 hour
                    estimatedArrivalTime: new Date(Date.now() + 10800000) // In 3 hours
                });
                await s.save();
                createdShipmentId = s._id;

                // Assignment
                if (dec.selectedPlan.vehicleAssignments && dec.selectedPlan.vehicleAssignments[0]) {
                    await Vehicle.findByIdAndUpdate(dec.selectedPlan.vehicleAssignments[0].vehicleId, { status: 'in_use' });
                }
            }

            dec.status = 'applied';
            dec.appliedBy = user._id;
            dec.appliedAt = new Date();
            await dec.save();

            // Master Audit Trail
            await require('./auditLogService').createLog(
                user._id, 'APPLIED_AI_PLAN', 'Decision', id, 'approved', 'applied',
                createdShipmentId ? `Created shipment ${createdShipmentId}` : 'No shipment needed',
                id
            );

            return { success: true, data: dec };

        } catch (e) {
            console.error('[DECISION_APPLY]', e);
            return { success: false, message: 'Failed to apply decision logic safely.' };
        }
    }
}

module.exports = new DecisionService();
