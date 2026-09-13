from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "FeatureOS FastAPI AI Service",
        "timestamp": datetime.utcnow().isoformat(),
        "runtime": {
            "ml_engine": "scikit-learn active",
            "agent_runtime": "LangGraph ready",
            "bayesian_engine": "operational",
        }
    }
