from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from app.api.project_settings import router as project_settings_router
from app.api.sources import router as sources_router
from app.api.warehouse import router as warehouse_router

from app.schemas.project import ProjectSettings

app = FastAPI(
    title="DBT Project Manager API",
    description="API for managing DBT projects, sources, models, and tests",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(project_settings_router, prefix="/api")
app.include_router(sources_router, prefix="/api")
app.include_router(warehouse_router, prefix="/api")

# In-memory session storage (for development)
project_settings = None


@app.get("/")
async def root():
    return {"message": "Welcome to DBT Project Manager API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
