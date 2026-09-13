from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.services.bayesian_engine import (
    bayesian_experiment_engine,
    VariantInput,
    ExperimentAnalysisResponse,
)

router = APIRouter(prefix="/ai/v1/experiments", tags=["Bayesian Experimentation Engine"])


class AnalyzeExperimentRequest(BaseModel):
    experiment_id: str
    variants: List[VariantInput]


@router.post("/analyze", response_model=ExperimentAnalysisResponse)
async def analyze_experiment(request: AnalyzeExperimentRequest):
    result = bayesian_experiment_engine.analyze_experiment(
        experiment_id=request.experiment_id,
        variants=request.variants,
    )
    return result


@router.get("/demo", response_model=ExperimentAnalysisResponse)
async def get_demo_analysis():
    demo_variants = [
        VariantInput(
            key="control",
            name="Control (Checkout v1)",
            sample_count=4200,
            conversions=378,
        ),
        VariantInput(
            key="one-click",
            name="Variant A: 1-Click Checkout",
            sample_count=4150,
            conversions=510,
        ),
        VariantInput(
            key="sticky-cta",
            name="Variant B: Sticky Bottom CTA",
            sample_count=4180,
            conversions=435,
        ),
    ]
    return bayesian_experiment_engine.analyze_experiment(
        experiment_id="exp-demo-bayesian-v1",
        variants=demo_variants,
    )
