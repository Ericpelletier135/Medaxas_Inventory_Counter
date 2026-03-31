import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)

from app.api.deps import get_user_manager, get_user_db, UserManager
from app.core.config import settings
from app.core.security import create_refresh_token, decode_refresh_token
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from pydantic import BaseModel


# --------------- fastapi-users transport / strategy ---------------

bearer_transport = BearerTransport(tokenUrl="/api/auth/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=settings.SECRET_KEY,
        lifetime_seconds=settings.ACCESS_TOKEN_EXPIRE_SECONDS,
    )


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend],
)

# --------------- routers ---------------

router = APIRouter(prefix="/api/auth", tags=["auth"])

# POST /api/auth/register
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
)

# POST /api/auth/login  &  POST /api/auth/logout
router.include_router(
    fastapi_users.get_auth_router(auth_backend),
)


# --------------- refresh token ---------------

class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@router.post("/login/refresh", response_model=TokenResponse)
async def login_with_refresh(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_manager: UserManager = Depends(get_user_manager),
    strategy: JWTStrategy = Depends(get_jwt_strategy),
):
    """Custom login that returns both access and refresh tokens."""
    user = await user_manager.authenticate(
        credentials=form_data,
    )
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LOGIN_BAD_CREDENTIALS",
        )

    access_token = await strategy.write_token(user)
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    body: RefreshRequest,
    user_manager: UserManager = Depends(get_user_manager),
    strategy: JWTStrategy = Depends(get_jwt_strategy),
):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    user_id = decode_refresh_token(body.refresh_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_REFRESH_TOKEN",
        )

    try:
        user = await user_manager.get(uuid.UUID(user_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_REFRESH_TOKEN",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="USER_INACTIVE",
        )

    access_token = await strategy.write_token(user)
    new_refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


# --------------- helper: current active user dependency ---------------

current_active_user = fastapi_users.current_user(active=True)


async def current_admin_user(
    user: User = Depends(current_active_user),
) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ADMIN_REQUIRED",
        )
    return user


@router.get("/me", response_model=UserRead)
async def get_current_user_me(
    user: User = Depends(current_active_user),
):
    return user
