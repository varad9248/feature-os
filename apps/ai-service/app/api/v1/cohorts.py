from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.services.cohort_discovery import (
    cohort_discovery_engine,
    DiscoveredCohort,
    ClusterScatterPoint,
)

router = APIRouter(prefix="/ai/v1/cohorts", tags=["AI Cohort Discovery Engine"])


class DiscoverCohortsRequest(BaseModel):
    flag_key: str = "dark-mode-v2"
    environment_id: str = "development"
    sample_size: int = 250


class DiscoverCohortsResponse(BaseModel):
    success: bool
    flag_key: str
    total_samples: int
    cohorts: List[DiscoveredCohort]
    scatter_points: List[ClusterScatterPoint]


@router.post("/discover", response_model=DiscoverCohortsResponse)
async def discover_cohorts(request: DiscoverCohortsRequest):
    cohorts, scatter_points = cohort_discovery_engine.discover_cohorts(
        flag_key=request.flag_key,
        n_samples=request.sample_size,
    )

    return DiscoverCohortsResponse(
        success=True,
        flag_key=request.flag_key,
        total_samples=len(scatter_points),
        cohorts=cohorts,
        scatter_points=scatter_points,
    )


@router.get("", response_model=DiscoverCohortsResponse)
async def get_discovered_cohorts(flag_key: str = "dark-mode-v2"):
    cohorts, scatter_points = cohort_discovery_engine.discover_cohorts(
        flag_key=flag_key,
        n_samples=250,
    )

    return DiscoverCohortsResponse(
        success=True,
        flag_key=flag_key,
        total_samples=len(scatter_points),
        cohorts=cohorts,
        scatter_points=scatter_points,
    )
