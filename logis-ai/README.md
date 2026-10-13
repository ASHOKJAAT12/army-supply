# LOGIS-AI: Predictive Logistics & Decision Support System

LOGIS-AI is a high-availability, full-stack logistics orchestration platform tailored for the SIH (Smart India Hackathon). It fuses live IoT tracking telemetry, predictive machine learning demand forecasting, and geographic capacity routing into a closed-loop **Decision Support System**.

## 🚀 Key Features

* **Central Command Center:** Real-time metrics overview and active system scorecard tracking offline nodes.
* **Predictive AI Engine:** Python FastAPI microservices running XGBoost to forecast consumption curves and OR-Tools for constraint-based logistics routing.
* **Event Orchestrator & MQTT Edge Telemetry:** Collects rapid sensor pulses, debounces events, and fires automated intelligence updates bridging hardware and software.
* **HITL Decision Platform:** "Human-in-the-loop" safeguards preventing autonomous runaway mutations. Presents multiple calculated candidate logistics plans to admins for simulation, approval, and execution.
* **Full Audit Logging:** Immutable MongoDB event ledgers capturing every action performed upon AI recommendation.

---

## 🛠 Tech Stack

* **Frontend:** React, Vite, Tailwind CSS, React-Leaflet
* **Backend:** Node.js, Express, MongoDB (Mongoose), MQTT (Aedes)
* **AI/Opt Engine:** Python, FastAPI, Pandas, Scikit-learn, XGBoost, OR-Tools

---

## 🏗 Setup & Installation

### Requirements
* Node.js v18+
* Python v3.10+
* MongoDB Community Server (Local) or Atlas cluster

### 1. Global Setup
Copy `.env.example` configurations to `.env` in both `/backend` and `/frontend` directories.

### 2. Launch Backend (Node.js)
```bash
cd backend
npm install
npm run dev
```

### 3. Launch Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

### 4. (Optional) Run the AI Service
If fully integrated with external Python systems:
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 🎭 SIH Demo Mode

To perform deterministic presentations without corrupting production environments, ensure your target `.env` file features:
`DEMO_MODE=true`

Then, reset the database explicitly using:
```bash
npm run demo
```
*Note: This command drops explicit collections to recreate a secure environment with standard active variables.*

---
*Built for SIH Advanced Agentic Coding requirements.*
