"""
Nemesis Data Models — Dark-Web Threat Intelligence Schema.
PostgreSQL is the source of truth; Neo4j is the relationship/graph view.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Numeric, DateTime,
    ForeignKey, JSON, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship as sa_relationship
from sqlalchemy.ext.hybrid import hybrid_property
from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ─────────────────────────────────────────────
# Operational Tables (Auth & Crawler Lifecycle)
# ─────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="investigator")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_login = Column(DateTime(timezone=True), nullable=True)


class CrawlJob(Base):
    __tablename__ = "crawl_jobs"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source_id = Column(UUID(as_uuid=False), ForeignKey("sources.source_id", ondelete="CASCADE"), nullable=True)
    url = Column(String(1000), nullable=False)
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="queued")
    error = Column(Text, nullable=True)
    depth = Column(Integer, default=0)
    pages_collected = Column(Integer, default=0)
    http_status = Column(Integer, nullable=True)

    @property
    def pages_crawled(self):
        return self.pages_collected

    @pages_crawled.setter
    def pages_crawled(self, val):
        self.pages_collected = val


# ─────────────────────────────────────────────
# Core Threat Intelligence Tables
# ─────────────────────────────────────────────

class Source(Base):
    __tablename__ = "sources"

    source_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source_type = Column(String(50), nullable=False)
    name = Column(Text, nullable=True)
    url = Column(Text, nullable=True)
    domain = Column(Text, nullable=True)
    reliability_score = Column(Numeric(4, 3), nullable=True)
    first_seen_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Backward-compatible metadata
    metadata_ = Column("metadata", JSON, default=dict)

    documents = sa_relationship("Document", back_populates="source", cascade="all, delete-orphan")

    @hybrid_property
    def onion_address(self):
        return self.url

    @onion_address.setter
    def onion_address(self, value):
        self.url = value


class Document(Base):
    __tablename__ = "documents"

    document_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source_id = Column(UUID(as_uuid=False), ForeignKey("sources.source_id", ondelete="CASCADE"), nullable=True)
    url = Column(Text, nullable=False)
    retrieved_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    http_status = Column(Integer, nullable=True)
    content_type = Column(Text, nullable=True)
    content_hash = Column(String(64), nullable=False, index=True)
    storage_uri = Column(Text, nullable=False)
    parser_version = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Helper fields
    title = Column(Text, nullable=True)
    normalized_content = Column(Text, nullable=True)
    is_processed = Column(String(10), default="false")

    source = sa_relationship("Source", back_populates="documents")
    semantic_blocks = sa_relationship("SemanticBlock", back_populates="document", cascade="all, delete-orphan")


class SemanticBlock(Base):
    __tablename__ = "semantic_blocks"

    block_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    document_id = Column(UUID(as_uuid=False), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    parent_block_id = Column(UUID(as_uuid=False), ForeignKey("semantic_blocks.block_id", ondelete="SET NULL"), nullable=True)
    block_type = Column(String(100), nullable=True)
    text_content = Column(Text, nullable=False)
    xpath = Column(Text, nullable=True)
    css_selector = Column(Text, nullable=True)
    dom_start = Column(Integer, nullable=True)
    dom_end = Column(Integer, nullable=True)
    char_start = Column(Integer, nullable=True)
    char_end = Column(Integer, nullable=True)
    block_hash = Column(String(64), nullable=True, index=True)
    sequence_number = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    document = sa_relationship("Document", back_populates="semantic_blocks")
    children = sa_relationship("SemanticBlock", backref="parent", remote_side=[block_id])
    extractions = sa_relationship("Extraction", back_populates="block", cascade="all, delete-orphan")
    mentions = sa_relationship("EntityMention", back_populates="block", cascade="all, delete-orphan")


class Extraction(Base):
    __tablename__ = "extractions"

    extraction_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    block_id = Column(UUID(as_uuid=False), ForeignKey("semantic_blocks.block_id", ondelete="CASCADE"), nullable=False)
    model_name = Column(Text, nullable=False)
    model_version = Column(Text, nullable=True)
    prompt_version = Column(Text, nullable=True)
    schema_version = Column(Text, nullable=True)
    raw_output = Column(JSONB, nullable=True)
    output_hash = Column(String(64), nullable=True)
    extraction_status = Column(String(30), default="success")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    block = sa_relationship("SemanticBlock", back_populates="extractions")
    mentions = sa_relationship("EntityMention", back_populates="extraction")


class Entity(Base):
    __tablename__ = "entities"

    entity_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_type = Column(String(50), nullable=False)
    canonical_name = Column(Text, nullable=True)
    normalized_value = Column(Text, nullable=True, index=True)
    first_seen_at = Column(DateTime(timezone=True), nullable=True, default=datetime.utcnow)
    last_seen_at = Column(DateTime(timezone=True), nullable=True, default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Subtype 1-to-1 relationships
    actor = sa_relationship("Actor", back_populates="entity", uselist=False, cascade="all, delete-orphan")
    handle_rel = sa_relationship("Handle", back_populates="entity", uselist=False, cascade="all, delete-orphan")
    pgp_key_rel = sa_relationship("PGPKey", back_populates="entity", uselist=False, cascade="all, delete-orphan")
    wallet_rel = sa_relationship("Wallet", back_populates="entity", uselist=False, cascade="all, delete-orphan")
    infrastructure_rel = sa_relationship("Infrastructure", back_populates="entity", uselist=False, cascade="all, delete-orphan")
    stylometry_profile = sa_relationship("StylometryProfile", back_populates="entity", uselist=False, cascade="all, delete-orphan")

    mentions = sa_relationship("EntityMention", back_populates="entity", cascade="all, delete-orphan")
    source_relationships = sa_relationship(
        "Relationship",
        foreign_keys="[Relationship.source_entity_id]",
        back_populates="source_entity",
        cascade="all, delete-orphan"
    )
    target_relationships = sa_relationship(
        "Relationship",
        foreign_keys="[Relationship.target_entity_id]",
        back_populates="target_entity",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("entity_type", "normalized_value", name="uq_entity_type_value"),
    )


class Actor(Base):
    __tablename__ = "actors"

    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), primary_key=True)
    category = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    attribution_confidence = Column(Numeric(4, 3), nullable=True)

    entity = sa_relationship("Entity", back_populates="actor")


class Handle(Base):
    __tablename__ = "handles"

    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), primary_key=True)
    handle = Column(Text, nullable=False)
    platform = Column(Text, nullable=True)

    entity = sa_relationship("Entity", back_populates="handle_rel")


class PGPKey(Base):
    __tablename__ = "pgp_keys"

    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), primary_key=True)
    fingerprint = Column(Text, nullable=False)
    public_key = Column(Text, nullable=True)

    entity = sa_relationship("Entity", back_populates="pgp_key_rel")


class Wallet(Base):
    __tablename__ = "wallets"

    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), primary_key=True)
    blockchain = Column(Text, nullable=True)
    address = Column(Text, nullable=False)

    entity = sa_relationship("Entity", back_populates="wallet_rel")


class Infrastructure(Base):
    __tablename__ = "infrastructure"

    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), primary_key=True)
    infrastructure_type = Column(Text, nullable=True)
    value = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict)

    entity = sa_relationship("Entity", back_populates="infrastructure_rel")


class EntityMention(Base):
    __tablename__ = "entity_mentions"

    mention_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False)
    block_id = Column(UUID(as_uuid=False), ForeignKey("semantic_blocks.block_id", ondelete="CASCADE"), nullable=False)
    extraction_id = Column(UUID(as_uuid=False), ForeignKey("extractions.extraction_id", ondelete="SET NULL"), nullable=True)
    evidence_text = Column(Text, nullable=True)
    evidence_start = Column(Integer, nullable=True)
    evidence_end = Column(Integer, nullable=True)
    extraction_confidence = Column(Numeric(4, 3), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    entity = sa_relationship("Entity", back_populates="mentions")
    block = sa_relationship("SemanticBlock", back_populates="mentions")
    extraction = sa_relationship("Extraction", back_populates="mentions")
    relationship_evidences = sa_relationship("RelationshipEvidence", back_populates="mention")


class Relationship(Base):
    __tablename__ = "relationships"

    relationship_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source_entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False)
    target_entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String(100), nullable=False)
    confidence = Column(Numeric(4, 3), nullable=True)
    status = Column(String(30), default="candidate")
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_to = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    source_entity = sa_relationship("Entity", foreign_keys=[source_entity_id], back_populates="source_relationships")
    target_entity = sa_relationship("Entity", foreign_keys=[target_entity_id], back_populates="target_relationships")
    evidences = sa_relationship("RelationshipEvidence", back_populates="rel", cascade="all, delete-orphan")


class RelationshipEvidence(Base):
    __tablename__ = "relationship_evidence"

    relationship_evidence_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    relationship_id = Column(UUID(as_uuid=False), ForeignKey("relationships.relationship_id", ondelete="CASCADE"), nullable=False)
    mention_id = Column(UUID(as_uuid=False), ForeignKey("entity_mentions.mention_id", ondelete="SET NULL"), nullable=True)
    evidence_type = Column(String(50), nullable=True)
    explanation = Column(Text, nullable=True)
    weight = Column(Numeric(4, 3), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    rel = sa_relationship("Relationship", back_populates="evidences")
    mention = sa_relationship("EntityMention", back_populates="relationship_evidences")


# ─────────────────────────────────────────────
# AI-Enhanced Stylometric Analysis Tables
# ─────────────────────────────────────────────

class StylometryProfile(Base):
    __tablename__ = "stylometry_profiles"

    profile_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    persona_name = Column(Text, nullable=False)
    document_count = Column(Integer, default=0)
    word_count = Column(Integer, default=0)
    character_count = Column(Integer, default=0)
    feature_vector = Column(JSONB, nullable=False)
    embedding_vector = Column(JSONB, nullable=False)
    aggregated_profile = Column(JSONB, nullable=True)
    source_references = Column(JSONB, default=list)
    model_name = Column(Text, default="nemesis-hybrid-stylometry-v2")
    model_version = Column(Text, default="2.1.0")
    feature_version = Column(Text, default="2.1.0")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    entity = sa_relationship("Entity", back_populates="stylometry_profile")


class StylometryComparison(Base):
    __tablename__ = "stylometry_comparisons"

    comparison_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source_entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False, index=True)
    target_entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False, index=True)
    source_name = Column(Text, nullable=False)
    target_name = Column(Text, nullable=False)
    overall_similarity = Column(Numeric(4, 3), nullable=False)
    traditional_similarity = Column(Numeric(4, 3), nullable=False)
    embedding_similarity = Column(Numeric(4, 3), nullable=False)
    component_scores = Column(JSONB, nullable=False)
    confidence_score = Column(Numeric(4, 3), nullable=False)
    confidence_band = Column(String(30), default="candidate")
    evidence_summary = Column(Text, nullable=True)
    model_version = Column(Text, default="2.1.0")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    source_entity = sa_relationship("Entity", foreign_keys=[source_entity_id])
    target_entity = sa_relationship("Entity", foreign_keys=[target_entity_id])
