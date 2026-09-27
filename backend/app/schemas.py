"""Pydantic schemas for API request/response validation"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Sources
# ─────────────────────────────────────────────

class SourceCreate(BaseModel):
    name: str
    onion_url: str
    type: str = "other"
    description: Optional[str] = None
    crawl_interval: int = 30
    tags: List[str] = []

class SourceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    crawl_interval: Optional[int] = None
    tags: Optional[List[str]] = None

class SourceResponse(BaseModel):
    source_id: str
    source_type: str
    name: Optional[str] = None
    url: Optional[str] = None
    domain: Optional[str] = None
    reliability_score: Optional[float] = None
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    # Frontend compatibility
    onion_address: Optional[str] = None
    metadata_: Dict[str, Any] = Field(default_factory=dict, validation_alias="metadata_", serialization_alias="metadata")

    class Config:
        from_attributes = True
        populate_by_name = True


# ─────────────────────────────────────────────
# Crawl Jobs
# ─────────────────────────────────────────────

class CrawlJobResponse(BaseModel):
    id: str
    source_id: Optional[str] = None
    url: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str
    error: Optional[str] = None
    depth: int = 0
    pages_collected: int = 0
    http_status: Optional[int] = None

    class Config:
        from_attributes = True

class CrawlRequest(BaseModel):
    source_id: str
    max_depth: Optional[int] = 3
    max_pages: Optional[int] = 50


# ─────────────────────────────────────────────
# Documents & Ingestion
# ─────────────────────────────────────────────

class DocumentIngestRequest(BaseModel):
    url: str
    html_content: str
    source_id: Optional[str] = None
    content_type: str = "text/html"
    http_status: int = 200

class DocumentResponse(BaseModel):
    document_id: str
    source_id: Optional[str] = None
    url: str
    retrieved_at: datetime
    http_status: Optional[int] = None
    content_type: Optional[str] = None
    content_hash: str
    storage_uri: str
    parser_version: Optional[str] = None
    created_at: datetime
    # Frontend compatibility
    title: Optional[str] = None
    source_url: Optional[str] = None
    is_processed: Optional[str] = "false"

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Semantic Blocks
# ─────────────────────────────────────────────

class SemanticBlockResponse(BaseModel):
    block_id: str
    document_id: str
    parent_block_id: Optional[str] = None
    block_type: Optional[str] = None
    text_content: str
    xpath: Optional[str] = None
    css_selector: Optional[str] = None
    dom_start: Optional[int] = None
    dom_end: Optional[int] = None
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    block_hash: Optional[str] = None
    sequence_number: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Extractions
# ─────────────────────────────────────────────

class ExtractionResponse(BaseModel):
    extraction_id: str
    block_id: str
    model_name: str
    model_version: Optional[str] = None
    prompt_version: Optional[str] = None
    schema_version: Optional[str] = None
    raw_output: Optional[Dict[str, Any]] = None
    output_hash: Optional[str] = None
    extraction_status: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# ─────────────────────────────────────────────
# Entities & Subtypes
# ─────────────────────────────────────────────

class ActorSubtypeResponse(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    attribution_confidence: Optional[float] = None

    class Config:
        from_attributes = True

class HandleSubtypeResponse(BaseModel):
    handle: str
    platform: Optional[str] = None

    class Config:
        from_attributes = True

class PGPKeySubtypeResponse(BaseModel):
    fingerprint: str
    public_key: Optional[str] = None

    class Config:
        from_attributes = True

class WalletSubtypeResponse(BaseModel):
    blockchain: Optional[str] = None
    address: str

    class Config:
        from_attributes = True

class InfrastructureSubtypeResponse(BaseModel):
    infrastructure_type: Optional[str] = None
    value: Optional[str] = None
    metadata_: Dict[str, Any] = Field(default_factory=dict, validation_alias="metadata_", serialization_alias="metadata")

    class Config:
        from_attributes = True
        populate_by_name = True

class EntityResponse(BaseModel):
    entity_id: str
    entity_type: str
    canonical_name: Optional[str] = None
    normalized_value: Optional[str] = None
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    # Subtypes
    actor: Optional[ActorSubtypeResponse] = None
    handle_rel: Optional[HandleSubtypeResponse] = None
    pgp_key_rel: Optional[PGPKeySubtypeResponse] = None
    wallet_rel: Optional[WalletSubtypeResponse] = None
    infrastructure_rel: Optional[InfrastructureSubtypeResponse] = None
    # Compatibility
    display_value: Optional[str] = None
    status: Optional[str] = "active"
    occurrence_count: int = 0

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Entity Mentions
# ─────────────────────────────────────────────

class EntityMentionResponse(BaseModel):
    mention_id: str
    entity_id: str
    block_id: str
    extraction_id: Optional[str] = None
    evidence_text: Optional[str] = None
    evidence_start: Optional[int] = None
    evidence_end: Optional[int] = None
    extraction_confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Relationships & Evidence
# ─────────────────────────────────────────────

class RelationshipEvidenceResponse(BaseModel):
    relationship_evidence_id: str
    relationship_id: str
    mention_id: Optional[str] = None
    evidence_type: Optional[str] = None
    explanation: Optional[str] = None
    weight: Optional[float] = None
    created_at: datetime
    mention: Optional[EntityMentionResponse] = None

    # Frontend UI compatibility fields
    evidence_id: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    score: Optional[float] = None
    observations: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class RelationshipResponse(BaseModel):
    relationship_id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    confidence: Optional[float] = None
    status: str = "candidate"
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    created_at: datetime
    evidences: List[RelationshipEvidenceResponse] = []

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# End-to-End Traceability
# ─────────────────────────────────────────────

class TraceabilityResponse(BaseModel):
    relationship_id: str
    relationship_type: str
    confidence: Optional[float]
    status: str
    source_entity: Dict[str, Any]
    target_entity: Dict[str, Any]
    evidence_chain: List[Dict[str, Any]]
    cryptographic_verification: Dict[str, Any]


# ─────────────────────────────────────────────
# Graph & Analytics
# ─────────────────────────────────────────────

class GraphResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


# ─────────────────────────────────────────────
# Infrastructure Analysis
# ─────────────────────────────────────────────

class InfrastructureAnalysisRequest(BaseModel):
    entity_id: Optional[str] = None
    onion_url: Optional[str] = None

class InfrastructureItemResponse(BaseModel):
    id: str
    type: str
    value: str
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    leaks: List[Dict[str, Any]] = Field(default_factory=list)
    open_ports: List[int] = Field(default_factory=list)
    asn: Optional[str] = None
    hosting_org: Optional[str] = None
    correlation_hypotheses: List[Dict[str, Any]] = Field(default_factory=list)

class InfrastructureAnalysisResponse(BaseModel):
    message: str
    services_analyzed: int
    leaks_detected: int
    candidate_hypotheses: int
    results: List[Dict[str, Any]]


# ─────────────────────────────────────────────
# AI-Enhanced Stylometry Schemas
# ─────────────────────────────────────────────

class StylometryProfileResponse(BaseModel):
    profile_id: str
    entity_id: str
    persona_name: str
    document_count: int
    word_count: int
    character_count: int
    feature_vector: Dict[str, Any]
    embedding_vector: List[float]
    aggregated_profile: Optional[Dict[str, Any]] = None
    source_references: List[Dict[str, Any]] = Field(default_factory=list)
    model_name: str
    model_version: str
    feature_version: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class StylometryComparisonResponse(BaseModel):
    comparison_id: str
    source_entity_id: str
    target_entity_id: str
    source_name: str
    target_name: str
    overall_similarity: float
    traditional_similarity: float
    embedding_similarity: float
    component_scores: Dict[str, Any]
    confidence_score: float
    confidence_band: str
    evidence_summary: Optional[str] = None
    model_version: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class StylometryTextAnalyzeRequest(BaseModel):
    text: str
    top_k: Optional[int] = 5
    title: Optional[str] = None


class StylometryTextAnalyzeMatch(BaseModel):
    persona_name: str
    entity_id: str
    overall_similarity: float
    traditional_similarity: float
    embedding_similarity: float
    component_scores: Dict[str, Any]
    confidence_score: float
    confidence_band: str
    evidence_summary: str


class StylometryTextAnalyzeResponse(BaseModel):
    word_count: int
    character_count: int
    extracted_features: Dict[str, Any]
    embedding_dim: int
    ranked_matches: List[StylometryTextAnalyzeMatch]


class StylometryRebuildResponse(BaseModel):
    status: str
    profiles_rebuilt: int
    comparisons_generated: int
    timestamp: datetime
    model_version: str
    feature_version: str

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

