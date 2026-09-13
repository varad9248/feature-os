from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.health import router as health_router
from app.api.v1.ai import router as ai_router
from app.api.v1.cohorts import router as cohorts_router
from app.api.v1.agents import router as agents_router
from app.api.v1.experiments import router as experiments_router
from app.api.v1.memory import router as memory_router
import prometheus_client
from fastapi.responses import Response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    print(f"[STARTUP] {settings.PROJECT_NAME} starting on port {settings.PORT}")
    yield
    # Teardown tasks
    print(f"[SHUTDOWN] {settings.PROJECT_NAME} shutting down")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="FastAPI Autonomous AI Service powering LangGraph multi-agent orchestration, ML cohort clustering, and Bayesian experimentation.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router)
app.include_router(ai_router)
app.include_router(cohorts_router)
app.include_router(agents_router)
app.include_router(experiments_router)
app.include_router(memory_router)


@app.get("/metrics")
async def prometheus_metrics():
    return Response(
        content=prometheus_client.generate_latest(),
        media_type=prometheus_client.CONTENT_TYPE_LATEST,
    )



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
