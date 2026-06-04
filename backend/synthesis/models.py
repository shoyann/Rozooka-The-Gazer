from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class SocialProfile(BaseModel):
    """A linked social media profile."""

    platform: str
    url: str
    username: str | None = None
    bio: str | None = None
    followers: int | None = None


class ConnectionEdge(BaseModel):
    """A connection between the subject and another person."""

    person_name: str
    relationship: str
    context: str | None = None
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class WorkHistoryEntry(BaseModel):
    """A single work history entry matching frontend WorkHistoryEntry."""

    role: str
    company: str
    period: str | None = None


class EducationEntry(BaseModel):
    """A single education entry matching frontend EducationEntry."""

    school: str
    degree: str | None = None


class SocialProfiles(BaseModel):
    """Social profile links matching frontend SocialProfiles."""

    linkedin: str | None = None
    twitter: str | None = None
    instagram: str | None = None
    github: str | None = None
    website: str | None = None


class SynthesisRequest(BaseModel):
    """Input for report synthesis."""

    person_name: str
    face_search_urls: list[str] = Field(default_factory=list)
    enrichment_snippets: list[str] = Field(default_factory=list)
    social_profiles: list[SocialProfile] = Field(default_factory=list)
    raw_agent_data: dict[str, str] = Field(default_factory=dict)


class StructuredDossier(BaseModel):
    """Fielded dossier data used for cards, graphing, and deterministic UI."""

    title: str | None = None
    company: str | None = None
    work_history: list[WorkHistoryEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    social_profiles: SocialProfiles = Field(default_factory=SocialProfiles)
    notable_activity: list[str] = Field(default_factory=list)
    conversation_hooks: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)

    def to_frontend_dict(self) -> dict:
        """Convert to camelCase dict matching frontend Structured Dossier."""
        return {
            "title": self.title,
            "company": self.company,
            "workHistory": [e.model_dump() for e in self.work_history],
            "education": [e.model_dump() for e in self.education],
            "socialProfiles": self.social_profiles.model_dump(exclude_none=True),
            "notableActivity": self.notable_activity,
            "conversationHooks": self.conversation_hooks,
            "riskFlags": self.risk_flags,
        }


class NarrativeDossier(BaseModel):
    """Human-readable summary layer shown even when full synthesis is incomplete."""

    summary: str = ""
    paragraphs: list[str] = Field(default_factory=list)

    def to_frontend_dict(self) -> dict:
        return {
            "summary": self.summary,
            "paragraphs": self.paragraphs,
        }


class DossierReport(BaseModel):
    """Final dossier bundle split into structured + narrative layers."""

    structured: StructuredDossier = Field(default_factory=StructuredDossier)
    narrative: NarrativeDossier = Field(default_factory=NarrativeDossier)
    synthesis_status: Literal["pending", "partial", "complete"] = "pending"
    synthesis_error: str | None = None
    structured_by: str | None = None
    narrative_by: str | None = None

    @property
    def summary(self) -> str:
        return self.narrative.summary

    @property
    def title(self) -> str | None:
        return self.structured.title

    @property
    def company(self) -> str | None:
        return self.structured.company

    @property
    def work_history(self) -> list[WorkHistoryEntry]:
        return self.structured.work_history

    @property
    def education(self) -> list[EducationEntry]:
        return self.structured.education

    @property
    def social_profiles(self) -> SocialProfiles:
        return self.structured.social_profiles

    @property
    def notable_activity(self) -> list[str]:
        return self.structured.notable_activity

    @property
    def conversation_hooks(self) -> list[str]:
        return self.structured.conversation_hooks

    @property
    def risk_flags(self) -> list[str]:
        return self.structured.risk_flags

    def to_frontend_dict(self) -> dict:
        return {
            "structured": self.structured.to_frontend_dict(),
            "narrative": self.narrative.to_frontend_dict(),
            "synthesisStatus": self.synthesis_status,
            "synthesisError": self.synthesis_error,
            "structuredBy": self.structured_by,
            "narrativeBy": self.narrative_by,
        }


class SynthesisResult(BaseModel):
    """Structured person intelligence report."""

    person_name: str
    summary: str = ""
    occupation: str | None = None
    organization: str | None = None
    location: str | None = None
    social_profiles: list[SocialProfile] = Field(default_factory=list)
    connections: list[ConnectionEdge] = Field(default_factory=list)
    key_facts: list[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    structured_dossier: StructuredDossier | None = None
    narrative_dossier: NarrativeDossier | None = None
    dossier: DossierReport | None = None
    success: bool = True
    error: str | None = None
