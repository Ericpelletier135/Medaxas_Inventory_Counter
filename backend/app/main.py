from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base
from app.db.session import engine
from app.api.auth import router as auth_router
from app.api.vendors import router as vendors_router
from app.api.items import router as items_router

# Import all models so they are registered on Base.metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (use Alembic in production instead)
    # Add simple retry loop so we wait for Postgres to be ready.
    last_exc: Exception | None = None
    for _ in range(5):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            last_exc = None
            break
        except Exception as exc:  # pragma: no cover - simple bootstrap guard
            last_exc = exc
            await asyncio.sleep(2)

    if last_exc is not None:
        # If we still couldn't connect after retries, re-raise so startup fails loudly.
        raise last_exc

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
app.include_router(vendors_router)
app.include_router(items_router)


@app.get("/")
async def root():
    return {"message": "Medaxas Inventory Counter API is running"}
