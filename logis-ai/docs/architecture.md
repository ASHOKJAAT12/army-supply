# LOGIS-AI System Architecture

LOGIS-AI integrates isolated subsystems (Inventory, Forecast, Route, GIS, IoT, Risk) into a singular **Unified Decision Support System**.

## Stack
- **Frontend / Client View:** React (Vite) + Tailwind + Recharts + Leaflet. Provides global state overview and HITL (Human-in-the-Loop) enforcement.
- **Node.js Core / Orchestration:** Express + MongoDB. Manages relational tracking, MQTT IoT trigger bridging, Auth RBAC, and standard backend logic. Acts as the central Event Orchestrator.
- **Python / AI Services:** FastAPI + XGBoost + OR-Tools + Scikit-Learn. Exclusively tasked with mathematical modeling (demand forecasting, capacity risk, route optimizations) entirely detached from direct state mutation.
- **Hardware / IoT Ingestion:** Node.js Aedes MQTT server acting as an edge telemetry collector.

## Security & Deployment Readiness
- Implemented **Helmet** headers and strict **CORS** restrictions.
- Added Express **Rate Limiting** bounding all APIs locally (100reqs/15m).
- Robust Error Handlers catch raw stack traces from Node.js and sanitize outputs to `{ success, message }`.
- Deterministic demo environments (protected by `.env DEMO_MODE`) provide clean, predictable staging formats.
