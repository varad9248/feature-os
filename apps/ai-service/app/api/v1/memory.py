from fastapi import APIRouter
from typing import Optional
from pydantic import BaseModel
from app.services.vector_memory import (
    vector_memory_engine,
    IncidentSearchRequest,
    IncidentSearchResponse,
)

router = APIRouter(prefix="/ai/v1/memory", tags=["AI Incident Vector Memory"])


class IndexIncidentRequest(BaseModel):
    id: str
    flag_key: str
    summary: str
    root_cause: Optional[str] = None
    resolution_details: Optional[str] = None


@router.post("/search", response_model=IncidentSearchResponse)
async def search_memory(request: IncidentSearchRequest):
    return vector_memory_engine.search_similar(
        query=request.query,
        flag_key=request.flag_key,
        top_k=request.top_k,
    )


@router.post("/index")
async def index_memory(request: IndexIncidentRequest):
    vector_memory_engine.index_incident(
        incident_id=request.id,
        flag_key=request.flag_key,
        summary=request.summary,
        root_cause=request.root_cause,
        resolution_details=request.resolution_details,
    )
    return {"success": True, "message": f"Incident {request.id} indexed into vector memory"}


@router.get("")
async def list_memories():
    memories = [
        {
            "id": m["id"],
            "flag_key": m["flag_key"],
            "summary": m["summary"],
            "root_cause": m.get("root_cause"),
            "resolution_details": m.get("resolution_details"),
            "created_at": m["created_at"],
        }
        for m in vector_memory_engine.corpus
    ]
    return {"success": True, "total": len(memories), "data": memories}
