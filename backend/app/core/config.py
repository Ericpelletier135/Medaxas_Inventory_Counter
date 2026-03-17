from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://medaxas_user:medaxas_secret_pw@db:5432/medaxas_db?ssl=disable"
    SECRET_KEY: str = "change-me-to-a-random-secret-key"
    REFRESH_SECRET_KEY: str = "change-me-to-a-different-random-secret-key"

    ACCESS_TOKEN_EXPIRE_SECONDS: int = 60 * 30  # 30 minutes
    REFRESH_TOKEN_EXPIRE_SECONDS: int = 60 * 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"


settings = Settings()
