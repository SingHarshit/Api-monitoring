from fastapi import FastAPI

from app.api.anomaly import router as anomaly_router
from app.api.rag import router as rag_router
from app.api.rca import router as rca_router


app = FastAPI(
    title="API Monitoring AI Service",
)

app.include_router(anomaly_router)
app.include_router(rag_router)
app.include_router(rca_router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
    }