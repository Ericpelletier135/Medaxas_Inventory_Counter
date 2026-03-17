from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base
from app.db.session import engine
from app.api.auth import router as auth_router

# Import all models so they are registered on Base.metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (use Alembic in production instead)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: dispose of the engine
    await engine.dispose()


app = FastAPI(
    title="Medaxas Inventory Counter API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

from app.api.stock_counts import router as stock_counts_router
from app.api.sales_orders import router as sales_orders_router

app.include_router(stock_counts_router)
app.include_router(sales_orders_router)


@app.get("/")
async def root():
    return {"message": "Medaxas Inventory Counter API is running"}
