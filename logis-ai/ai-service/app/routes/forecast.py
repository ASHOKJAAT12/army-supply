from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Forecast service health")
def forecast_health():
    """
    Placeholder — Demand forecasting engine will be implemented in Phase 4.
    """
    return {
        "status": "placeholder",
        "module": "Demand Forecasting",
        "phase": 4,
        "message": "Forecasting engine not yet implemented. Coming in Phase 4.",
    }


@router.get("/demand", summary="Demand forecast (stub)")
def demand_forecast(location: str = "all"):
    """
    Stub endpoint — will return XGBoost-powered demand predictions per location.
    """
    return {
        "location": location,
        "status": "stub",
        "message": "Forecasting model not trained yet. Phase 4.",
    }
