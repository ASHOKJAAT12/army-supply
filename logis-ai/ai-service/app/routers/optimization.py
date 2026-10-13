from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.optimization_service import optimize_logistics

router = APIRouter(
    prefix="/optimization",
    tags=["Optimization"]
)

class OptimizationRequest(BaseModel):
    shipments: List[Dict[str, Any]]
    vehicles: List[Dict[str, Any]]
    distanceMatrix: List[List[float]]
    costMatrix: List[List[float]]
    weights: Optional[Dict[str, float]] = None

@router.post("/run")
async def run_optimization(request: OptimizationRequest):
    try:
        result = optimize_logistics(request.dict())
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
