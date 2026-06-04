"""Environment validation for backend service adapters."""

from __future__ import annotations

from dataclasses import dataclass

from config import Settings


@dataclass(frozen=True)
class ServiceCheck:
    name: str
    ready: bool
    missing_vars: list[str]


_SERVICE_ENV_MAP: dict[str, list[str]] = {
    "convex": ["CONVEX_URL"],
    "exa": ["EXA_API_KEY"],
    "gemini": ["GEMINI_API_KEY"],
    "anthropic": ["ANTHROPIC_API_KEY"],
    "browser_use": ["BROWSER_USE_API_KEY"],
    "openai": ["OPENAI_API_KEY"],
    "mongodb": ["MONGODB_URI"],
    "sixtyfour": ["SIXTYFOUR_API_KEY"],
}


def check_service(name: str, settings: Settings) -> ServiceCheck:
    required = _SERVICE_ENV_MAP.get(name, [])
    flags = settings.service_flags()
    missing = [var for var in required if not flags.get(name, False)]
    return ServiceCheck(name=name, ready=len(missing) == 0, missing_vars=missing)


def check_all_services(settings: Settings) -> list[ServiceCheck]:
    return [check_service(name, settings) for name in _SERVICE_ENV_MAP]
