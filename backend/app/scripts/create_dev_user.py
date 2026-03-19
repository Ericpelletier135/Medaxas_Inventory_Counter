import asyncio

from sqlalchemy import select

from fastapi_users.password import PasswordHelper

from app.db.session import async_session_maker, engine
from app.db.base import Base
from app.models.user import User


async def _create_dev_user() -> None:
    # Ensure tables exist (similar to app lifespan)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    password_helper = PasswordHelper()

    email = "dev@divomed.com"
    password = "devpassword123"

    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.email == email))
        existing = result.scalars().first()
        if existing:
            print(f"Dev user already exists with email={email}")
            return

        user = User(
            email=email,
            hashed_password=password_helper.hash(password),
            is_active=True,
            is_superuser=True,
            is_verified=True,
            first_name="Dev",
            last_name="User",
            role="admin",
            status="active",
        )

        session.add(user)
        await session.commit()

        print(f"Created dev user email={email} password={password}")


def main() -> None:
    asyncio.run(_create_dev_user())


if __name__ == "__main__":
    main()

