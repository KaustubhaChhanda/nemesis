-- Nemesis Schema Migration v2: Dark-Web Threat Intelligence Data Schemas
DROP TABLE IF EXISTS relationship_evidence CASCADE;
DROP TABLE IF EXISTS relationships CASCADE;
DROP TABLE IF EXISTS relationship_assertions CASCADE;
DROP TABLE IF EXISTS entity_mentions CASCADE;
DROP TABLE IF EXISTS infrastructure CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS pgp_keys CASCADE;
DROP TABLE IF EXISTS handles CASCADE;
DROP TABLE IF EXISTS actors CASCADE;
DROP TABLE IF EXISTS actor_cluster_members CASCADE;
DROP TABLE IF EXISTS actor_clusters CASCADE;
DROP TABLE IF EXISTS extractions CASCADE;
DROP TABLE IF EXISTS semantic_blocks CASCADE;
DROP TABLE IF EXISTS observations CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS entities CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS forum_accounts CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS sources CASCADE;
DROP TABLE IF EXISTS crawl_jobs CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE sources (
    source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL,
    name TEXT,
    url TEXT,
    domain TEXT,
    reliability_score NUMERIC(4,3),
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSON DEFAULT '{}'
);

CREATE TABLE documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES sources(source_id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    http_status INTEGER,
    content_type TEXT,
    content_hash CHAR(64) NOT NULL,
    storage_uri TEXT NOT NULL,
    parser_version TEXT,
    title TEXT,
    normalized_content TEXT,
    is_processed VARCHAR(10) DEFAULT 'false',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE semantic_blocks (
    block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    parent_block_id UUID REFERENCES semantic_blocks(block_id) ON DELETE SET NULL,
    block_type VARCHAR(100),
    text_content TEXT NOT NULL,
    xpath TEXT,
    css_selector TEXT,
    dom_start INTEGER,
    dom_end INTEGER,
    char_start INTEGER,
    char_end INTEGER,
    block_hash CHAR(64),
    sequence_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE extractions (
    extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES semantic_blocks(block_id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    model_version TEXT,
    prompt_version TEXT,
    schema_version TEXT,
    raw_output JSONB,
    output_hash CHAR(64),
    extraction_status VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE entities (
    entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    canonical_name TEXT,
    normalized_value TEXT,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_entity_type_value UNIQUE (entity_type, normalized_value)
);

CREATE TABLE actors (
    entity_id UUID PRIMARY KEY REFERENCES entities(entity_id) ON DELETE CASCADE,
    category TEXT,
    description TEXT,
    attribution_confidence NUMERIC(4,3)
);

CREATE TABLE handles (
    entity_id UUID PRIMARY KEY REFERENCES entities(entity_id) ON DELETE CASCADE,
    handle TEXT NOT NULL,
    platform TEXT
);

CREATE TABLE pgp_keys (
    entity_id UUID PRIMARY KEY REFERENCES entities(entity_id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    public_key TEXT
);

CREATE TABLE wallets (
    entity_id UUID PRIMARY KEY REFERENCES entities(entity_id) ON DELETE CASCADE,
    blockchain TEXT,
    address TEXT NOT NULL
);

CREATE TABLE infrastructure (
    entity_id UUID PRIMARY KEY REFERENCES entities(entity_id) ON DELETE CASCADE,
    infrastructure_type TEXT,
    value TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE entity_mentions (
    mention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    block_id UUID NOT NULL REFERENCES semantic_blocks(block_id) ON DELETE CASCADE,
    extraction_id UUID REFERENCES extractions(extraction_id) ON DELETE SET NULL,
    evidence_text TEXT,
    evidence_start INTEGER,
    evidence_end INTEGER,
    extraction_confidence NUMERIC(4,3),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL,
    confidence NUMERIC(4,3),
    status VARCHAR(30) DEFAULT 'candidate',
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE relationship_evidence (
    relationship_evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id UUID NOT NULL REFERENCES relationships(relationship_id) ON DELETE CASCADE,
    mention_id UUID REFERENCES entity_mentions(mention_id) ON DELETE SET NULL,
    evidence_type VARCHAR(50),
    explanation TEXT,
    weight NUMERIC(4,3),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES sources(source_id) ON DELETE CASCADE,
    url VARCHAR(1000) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'queued',
    error TEXT,
    depth INTEGER DEFAULT 0,
    pages_collected INTEGER DEFAULT 0,
    http_status INTEGER
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'investigator',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);
