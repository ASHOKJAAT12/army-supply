from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import forecast

app = FastAPI(
    title="LOGIS-AI — AI Service",
    description="Predictive analytics and route optimization engine (Phase 0 scaffold)",
    version="0.1.0",
)

# Allow requests from the frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(forecast.router, prefix="/api/forecast", tags=["Forecast"])


@app.get("/health", tags=["Health"])
def health_check():
    """AI service liveness probe."""
    return {"status": "ok", "service": "LOGIS-AI AI Service", "version": "0.1.0"}
