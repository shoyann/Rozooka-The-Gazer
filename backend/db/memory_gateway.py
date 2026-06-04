from __future__ import annotations

from typing import Any
from uuid import uuid4

from intel.models import IntelFragment


class InMemoryDatabaseGateway:
    """In-memory implementation of DatabaseGateway for local development."""

    def __init__(self) -> None:
        self._persons: dict[str, dict[str, Any]] = {}
        self._captures: dict[str, dict[str, Any]] = {}
        self._connections: dict[str, dict[str, Any]] = {}
        self._intel_fragments: list[dict[str, Any]] = []

    @property
    def configured(self) -> bool:
        return True

    async def store_person(self, person_id: str, data: dict[str, Any]) -> str:
        self._persons[person_id] = {**data, "person_id": person_id}
        return person_id

    async def get_person(self, person_id: str) -> dict[str, Any] | None:
        return self._persons.get(person_id)

    async def update_person(self, person_id: str, data: dict[str, Any]) -> None:
        existing = self._persons.get(person_id, {})
        self._persons[person_id] = {**existing, **data, "person_id": person_id}

    async def store_capture(self, capture_id: str, metadata: dict[str, Any]) -> str:
        existing = self._captures.get(capture_id, {})
        self._captures[capture_id] = {**existing, **metadata, "capture_id": capture_id}
        return capture_id

    async def get_capture(self, capture_id: str) -> dict[str, Any] | None:
        return self._captures.get(capture_id)

    async def list_persons_with_dossiers(self) -> list[dict[str, Any]]:
        return [
            person for person in self._persons.values()
            if person.get("dossier") is not None
        ]

    async def create_connection(
        self,
        person_a_id: str,
        person_b_id: str,
        relationship_type: str,
        description: str,
    ) -> str:
        connection_id = f"conn_{uuid4().hex[:12]}"
        self._connections[connection_id] = {
            "connection_id": connection_id,
            "person_a_id": person_a_id,
            "person_b_id": person_b_id,
            "relationship_type": relationship_type,
            "description": description,
        }
        return connection_id

    async def store_intel_fragment(self, fragment: IntelFragment) -> str:
        fragment_id = f"intel_{uuid4().hex[:12]}"
        self._intel_fragments.append({
            "fragment_id": fragment_id,
            **fragment.model_dump(),
        })
        return fragment_id
