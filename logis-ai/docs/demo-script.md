# LOGIS-AI SIH Demonstration Script (3-5 mins)

## Setup instructions
1. Add `.env` file to both `backend` and `frontend`. Set `DEMO_MODE=true` in `backend/.env`.
2. Start MongoDB, Backend, Frontend.
3. Keep the IoT simulator (`node simulator/iotSimulator.js`) ready in another terminal.

---

### Step 1: Normal System Command Center (30s)
* **Action:** Login as `admin@logis-ai.com` and show the main Dashboard.
* **Talk Track:** "Welcome to LOGIS-AI. This is our unified command center for military & high-stakes logistics. Right now, our predictive AI and hardware checks show everything is green. But logistics are unpredictable."

### Step 2: In-Field IoT Failure (45s)
* **Action:** Trigger the simulated IoT collapse by running the simulator script.
* **Talk Track:** "Suddenly, a convoy reports a catastrophic loss of supplies en-route, picked up via telemetry. Watch the dashboard."
* **Action:** Direct attention to the active alert on the notifications bell and the Inventory map turning red.
* **Talk Track:** "Our IoT edge nodes have bypassed human reporting delays. The inventory has fallen into critical capacity instantaneously."

### Step 3: Predictive Risk Engines (30s)
* **Action:** Open the *Forecasts & Risk* page.
* **Talk Track:** "Our XGBoost pipelines don’t just report the drop—they predict the ripple effect. The system calculates a high risk of mission failure because local weather conditions have degraded."

### Step 4: Decision Generation (45s)
* **Action:** Open *Decision Center*.
* **Talk Track:** "The SIH guidelines request a Decision Support System, not an autonomous one. The AI has debounced the panic events and generated an official recommendation. Let's dig into it."
* **Action:** Open the highly-urgent Decision. Show Evidence & Confidence Scoring.
* **Talk Track:** "The AI analyzed optimal paths using OR-Tools, weighing the weather risks. It recommends an alternate 24-hour supply convoy run."

### Step 5: Human-In-The-Loop Execution (30s)
* **Action:** Click **Simulate Alternative**, then explicitly hit **Approve** and **Apply to Live System**.
* **Talk Track:** "As an admin, I simulate the fallback. The risk is minimized. I lock in the decision. Our backend mutation runs."
* **Action:** Show the immutable MongoDB *Audit Log* and *Shipments* page confirming the new route is active.
* **Conclusion:** "LOGIS-AI detected an invisible supply chain break, analyzed alternative resupplies, provided transparent SIH-compliant decision support, and applied changes securely. Thank you."
