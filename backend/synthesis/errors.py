from __future__ import annotations

import re


def friendly_provider_error(provider: str, error: object) -> str:
    """Return a short frontend-safe provider error while logs keep raw details."""
    text = str(error)
    lower = text.lower()

    if "429" in text or "rate" in lower or "quota" in lower or "resource_exhausted" in lower:
        return f"{provider} is temporarily rate limited. Please retry later."

    if "api key" in lower or "authentication" in lower or "unauthorized" in lower:
        return f"{provider} authentication failed. Check the configured API key."

    if "timeout" in lower or "timed out" in lower:
        return f"{provider} timed out while generating the dossier."

    if "overloaded" in lower or "unavailable" in lower or "503" in text:
        return f"{provider} is temporarily unavailable. Please retry later."

    compact = re.sub(r"\s+", " ", text).strip()
    if not compact:
        return f"{provider} synthesis failed."
    return f"{provider} synthesis failed: {compact[:160]}"
