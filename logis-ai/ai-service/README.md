# LOGIS-AI — AI Service

FastAPI-based forecasting and route optimization engine.

> 📌 **Phase 0** — scaffold only. ML models are integrated in Phase 4.

## Tech Stack
- Python 3.10+
- FastAPI
- scikit-learn, XGBoost, pandas, numpy

## Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start dev server
uvicorn app.main:app --reload --port 8000
```

## Endpoints (Phase 0)

| Method | URL                    | Description                    |
|--------|------------------------|--------------------------------|
| GET    | `/health`              | Service health check           |
| GET    | `/api/forecast/health` | Forecast module stub           |
| GET    | `/api/forecast/demand` | Demand forecast stub (Phase 4) |

## Docs
Browse the auto-generated docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
