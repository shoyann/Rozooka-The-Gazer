from __future__ import annotations

from collections.abc import Awaitable, Callable
from contextlib import contextmanager
from functools import wraps
from typing import Any, TypeVar, cast

F = TypeVar("F", bound=Callable[..., Any])


def initialize_laminar(_settings: Any | None = None) -> None:
    """No-op tracing initializer kept for compatibility."""


@contextmanager
def observe_span(_name: str, **_kwargs: Any):
    """No-op tracing span context manager."""
    yield


def traced(_name: str, tags: list[str] | None = None) -> Callable[[F], F]:
    """No-op decorator that preserves async and sync call signatures."""
    _ = tags

    def decorator(func: F) -> F:
        if getattr(func, "__code__", None) and func.__code__.co_flags & 0x80:
            @wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                return await cast(Callable[..., Awaitable[Any]], func)(*args, **kwargs)

            return cast(F, async_wrapper)

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            return func(*args, **kwargs)

        return cast(F, sync_wrapper)

    return decorator
