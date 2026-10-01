from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db.database import init_db
from backend.db.seed import seed_db
from backend.routes.catalog import router as catalog_router
from backend.routes.execute import router as execute_router
from backend.routes.health import router as health_router
from backend.routes.problems import router as problems_router
from backend.routes.quiz import router as quiz_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes tables and seeds canonical data on startup."""
    init_db()
    seed_db()
    yield


app = FastAPI(
    title="again! Recall and Coding Workbench API",
    description="Localhost-first developer practice and code recall platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for local frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(health_router, prefix="/api")
app.include_router(catalog_router, prefix="/api")
app.include_router(quiz_router, prefix="/api")
app.include_router(problems_router, prefix="/api")
app.include_router(execute_router, prefix="/api")


@app.get("/")
def read_root():
    """Root endpoint providing service status and docs link."""
    return {
        "app": "again!",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
    }
