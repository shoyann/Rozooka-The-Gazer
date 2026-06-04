from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(_BACKEND_DIR / ".env"), str(_ROOT_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="", alias="THE_GAZER_APP_NAME")
    environment: str = Field(default="", alias="THE_GAZER_ENV")
    log_level: str = Field(default="", alias="THE_GAZER_LOG_LEVEL")
    frontend_origin: str = Field(default="", alias="THE_GAZER_FRONTEND_ORIGIN")
    api_port: str = Field(default="", alias="THE_GAZER_API_PORT")

    convex_url: str = Field(default="", alias="CONVEX_URL")
    mongodb_uri: str = Field(default="", alias="MONGODB_URI")
    exa_api_key: str = Field(default="", alias="EXA_API_KEY")
    browser_use_api_key: str = Field(default="", alias="BROWSER_USE_API_KEY")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    hibp_api_key: str = Field(default="", alias="HIBP_API_KEY")
    pimeyes_account_pool: str = Field(default="", alias="PIMEYES_ACCOUNT_POOL")
    daytona_api_key: str = Field(default="", alias="DAYTONA_API_KEY")
    daytona_api_url: str = Field(default="", alias="DAYTONA_API_URL")
    hud_api_key: str = Field(default="", alias="HUD_API_KEY")
    agentmail_api_key: str = Field(default="", alias="AGENTMAIL_API_KEY")
    pimeyes_email: str = Field(default="", alias="PIMEYES_EMAIL")
    pimeyes_password: str = Field(default="", alias="PIMEYES_PASSWORD")
    sixtyfour_api_key: str = Field(default="", alias="SIXTYFOUR_API_KEY")
    browser_use_profile_id: str = Field(default="", alias="BROWSER_USE_PROFILE_ID")
    op_vault_id: str = Field(default="", alias="OP_VAULT_ID")
    sherlock_timeout_seconds: float = Field(default=20.0, alias="SHERLOCK_TIMEOUT_SECONDS")
    sherlock_max_usernames: int = Field(default=3, alias="SHERLOCK_MAX_USERNAMES")
    sherlock_max_sites: int = Field(default=24, alias="SHERLOCK_MAX_SITES")

    def service_flags(self) -> dict[str, bool]:
        return {
            "convex": bool(self.convex_url),
            "mongodb": bool(self.mongodb_uri),
            "exa": bool(self.exa_api_key),
            "browser_use": bool(self.browser_use_api_key),
            "openai": bool(self.openai_api_key),
            "gemini": bool(self.gemini_api_key),
            "anthropic": bool(self.anthropic_api_key),
            "hibp": bool(self.hibp_api_key),
            "pimeyes_pool": self.pimeyes_account_pool not in {"", "[]"},
            "daytona": bool(self.daytona_api_key),
            "hud": bool(self.hud_api_key),
            "agentmail": bool(self.agentmail_api_key),
            "pimeyes": bool(self.pimeyes_email and self.pimeyes_password),
            "sixtyfour": bool(self.sixtyfour_api_key),
            "browser_use_profile": bool(self.browser_use_profile_id),
            "sherlock": True,
        }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
