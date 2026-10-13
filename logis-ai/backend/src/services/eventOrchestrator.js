const notificationService = require('./notificationService');
const riskService = require('./riskService');
// We will load decisionService via require at the point of action, or using dynamic require 
// to prevent cyclic dependency if decisionService also triggers orchestrator.
let decisionService;

class EventOrchestrator {
    constructor() {
        this.cache = new Map();
        this.timers = {};
    }

    // Debounce triggers based on location id / decision block window
    async handleInventoryEvent(locationId, itemId, currentQuantity, status, source) {
        console.log(`[ORCHESTRATOR] Received inventory event for loc:${locationId} (status: ${status}) via ${source}`);

        // Let's create an alert if status crosses warning/critical
        if (status === 'critical') {
            await notificationService.createNotification(
                'critical_inventory',
                `CRITICAL INVENTORY: Location ID ${locationId.toString().substring(0, 6)} is critical for Item ${itemId.toString().substring(0, 6)}`,
                'critical',
                'Inventory',
                null,
                `inv-crit-${locationId}-${itemId}`
            );
        }

        // De-dup rapid IoT bursts! Wait 5 seconds before causing cascading Decision Engine trigger
        const key = `inv-dec-${locationId}`;
        this.throttleTrigger(key, 5000, async () => {
            await this._triggerDecisionEngine(locationId);
        });
    }

    async handleForecastEvent(locationId) {
        // e.g. prediction script finished
        console.log(`[ORCHESTRATOR] Forecast completed for loc:${locationId}`);
        const key = `for-dec-${locationId}`;
        this.throttleTrigger(key, 5000, async () => {
            await this._triggerDecisionEngine(locationId);
        });
    }

    throttleTrigger(key, ms, callback) {
        if (this.timers[key]) return; // already active window
        this.timers[key] = true;
        setTimeout(() => {
            callback();
            delete this.timers[key];
        }, ms);
    }

    async _triggerDecisionEngine(locationId) {
        try {
            if (!decisionService) decisionService = require('./decisionService');
            // Check if there is already an active decision review for this location to avoid spam
            // (The decisionEngine itself can do this check during Generate. So fire and forget!)
            console.log(`[ORCHESTRATOR] Cascading trigger to Decision Engine for loc:${locationId}`);

            // We pass an automated invocation parameter
            await decisionService.generateDecision({ locationId, automated: true });

        } catch (e) {
            console.error('[ORCHESTRATOR] Error triggering decision engine', e.message);
        }
    }
}

module.exports = new EventOrchestrator();
