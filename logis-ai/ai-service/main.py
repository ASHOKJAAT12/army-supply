import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from contextlib import asynccontextmanager
from pymongo import MongoClient
from ml_engine import MLEngine

# Database connection placeholder
client = None
db = None
model_cache = {} # In-memory cache for demo ({ "loc_item": {type, model, df} })
client = None
db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client, db
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/logis-ai")
    try:
        client = MongoClient(mongo_uri)
        db = client.get_database()
        print("Connected to MongoDB from AI Service.")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
    yield
    if client:
        client.close()

from fastapi.middleware.cors import CORSMiddleware
from app.routers import forecast, optimization

app = FastAPI(title="LOGIS-AI Predictions API", lifespan=lifespan)

app.include_router(forecast.router)
app.include_router(optimization.router)

# Definitions
class TrainRequest(BaseModel):
    locationId: str
    itemId: str

class ForecastRequest(BaseModel):
    locationId: str
    itemId: str
    horizonDays: int

@app.get("/health")
def health_check():
    return {"status": "ONLINE", "service": "AI Forecasting Engine"}

@app.post("/api/v1/models/train")
def train_model(payload: TrainRequest):
    """
    Chronological Feature Engineering and XGBoost training endpoint.
    Retrieves consumption history from MongoDB.
    """
    df_raw = MLEngine.get_historical_data(db, payload.locationId, payload.itemId)
    df_feat = MLEngine.prepare_features(df_raw)
    
    result = MLEngine.train_evaluate(df_feat)
    
    cache_key = f"{payload.locationId}_{payload.itemId}"
    
    if result["status"] == "insufficient_data":
        model_cache[cache_key] = {"type": "fallback", "data": df_raw}
        return {
            "success": True,
            "data": {
                "locationId": payload.locationId,
                "itemId": payload.itemId,
                "modelUsed": "moving_average",
                "status": "insufficient_data",
                "message": result.get("message", "Using fallback moving average")
            }
        }
    
    # Cache the trained resources
    model_cache[cache_key] = {
        "type": "ml",
        "model": result["model"],
        "latest_data": result["latest_data"]
    }
    
    return {
        "success": True,
        "data": {
            "locationId": payload.locationId,
            "itemId": payload.itemId,
            "modelUsed": result["model_used"],
            "trainingSamples": result["training_samples"],
            "mae": result.get("xgboost_mae") if result["model_used"] == "xgboost" else result.get("baseline_mae"),
            "rmse": result.get("xgboost_rmse") if result["model_used"] == "xgboost" else result.get("baseline_rmse"),
            "baseline_mae": result.get("baseline_mae"),
            "xgboost_mae": result.get("xgboost_mae"),
            "featureImportance": result.get("feature_importance", {})
        }
    }

@app.post("/api/v1/forecast")
def generate_forecast(payload: ForecastRequest):
    """
    Inference endpoint triggering predictions up to `horizonDays`.
    """
    if payload.horizonDays not in [7, 14, 30]:
        raise HTTPException(status_code=400, detail="Invalid horizon. Supported: 7, 14, 30")
        
    cache_key = f"{payload.locationId}_{payload.itemId}"
    
    # Check if model exists in cache (i.e. trained recently)
    if cache_key not in model_cache:
        # Auto-trigger a train cycle if missing
        train_model(TrainRequest(locationId=payload.locationId, itemId=payload.itemId))
        
    cached = model_cache.get(cache_key)
    
    if cached["type"] == "ml":
        model_used = "xgboost"
        forecast_list = MLEngine.recursive_predict(cached["model"], cached["latest_data"], payload.horizonDays)
    else:
        model_used = "moving_average"
        forecast_list = MLEngine.simple_baseline_predict(cached["data"], payload.horizonDays)
        
    # Calculate confidence based on data properties (demo simplistic logic)
    confidence_level = "low" if cached["type"] == "fallback" else "high"

    return {
        "success": True,
        "data": {
            "locationId": payload.locationId,
            "itemId": payload.itemId,
            "horizonDays": payload.horizonDays,
            "modelUsed": model_used,
            "confidenceLevel": confidence_level,
            "forecast": forecast_list
        }
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
