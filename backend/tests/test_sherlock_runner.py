from __future__ import annotations

import time

import pytest

from agents.models import AgentStatus, SocialProfile
from agents.sherlock_runner import SherlockProfileMatch, SherlockRunner
from config import Settings


@pytest.mark.asyncio
async def test_sherlock_runner_aggregates_claimed_profiles() -> None:
    runner = SherlockRunner(Settings())
    runner._site_data = {"GitHub": {"url": "https://github.com/{}"}}  # type: ignore[attr-defined]

    def fake_run_search(_candidate_usernames: list[str]) -> list[SherlockProfileMatch]:
        return [
            SherlockProfileMatch(
                username="janedoe",
                site_name="GitHub",
                url="https://github.com/janedoe",
            ),
            SherlockProfileMatch(
                username="jane.doe",
                site_name="Medium",
                url="https://medium.com/@jane.doe",
            ),
        ]

    runner._run_search = fake_run_search  # type: ignore[method-assign]

    result = await runner.research(
        person_name="Jane Doe",
        urls=["https://linkedin.com/in/janedoe"],
        profiles=[SocialProfile(platform="linkedin", url="https://linkedin.com/in/janedoe")],
    )

    assert result is not None
    assert result.status == AgentStatus.SUCCESS
    assert result.agent_name == "sherlock"
    assert "https://github.com/janedoe" in result.urls_found
    assert any("GitHub" in snippet for snippet in result.snippets)


@pytest.mark.asyncio
async def test_sherlock_runner_times_out_gracefully() -> None:
    runner = SherlockRunner(Settings())
    runner._site_data = {"GitHub": {"url": "https://github.com/{}"}}  # type: ignore[attr-defined]
    runner._timeout_seconds = 0.01  # type: ignore[attr-defined]

    def slow_run_search(_candidate_usernames: list[str]) -> list[SherlockProfileMatch]:
        time.sleep(0.05)
        return []

    runner._run_search = slow_run_search  # type: ignore[method-assign]

    result = await runner.research(person_name="Jane Doe")

    assert result is not None
    assert result.status == AgentStatus.TIMEOUT
    assert result.error == "sherlock_timeout"
