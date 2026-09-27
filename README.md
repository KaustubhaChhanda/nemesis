# Nemesis - Dark Web Intelligence Platform

Nemesis is an autonomous dark web intelligence platform built for the deanonymization and attribution of threat actors operating on Tor hidden services. It continuously collects intelligence from dark web sources, extracts threat indicators, correlates identities across platforms, and presents findings through an analytical dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Crawling and Collection](#crawling-and-collection)
- [Semantic Parsing](#semantic-parsing)
- [Intelligence Extraction](#intelligence-extraction)
- [Identity Correlation and Actor Derivation](#identity-correlation-and-actor-derivation)
- [Infrastructure Analysis](#infrastructure-analysis)
- [Stylometric Analysis](#stylometric-analysis)
- [Behavioural Profiling](#behavioural-profiling)
- [Graph Database and Visualization](#graph-database-and-visualization)
- [Autonomous Mode](#autonomous-mode)
- [Frontend and Dashboard](#frontend-and-dashboard)
- [Controlled Demonstration Environment](#controlled-demonstration-environment)
- [Real Darknet Usage](#real-darknet-usage)
- [Tech Stack](#tech-stack)
- [Setup and Deployment](#setup-and-deployment)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Overview

Dark web threat actors operate behind Tor hidden services to conceal their identity. Nemesis addresses this by continuously gathering their digital footprints from marketplaces, forums, and paste services, then applying a multi-stage analysis pipeline to correlate identities and attribute activity to real-world actors.

The system implements three core capabilities:

1. Infrastructure analysis — detecting misconfigurations in Tor hidden services and correlating them with clearnet infrastructure to identify likely origin servers.
2. Cross-platform identity mapping — linking handles, PGP keys, cryptocurrency wallets, and trust relationships across multiple dark web sources into a unified threat actor graph.
3. AI-based stylometric and behavioural profiling — detecting when actors rebrand, migrate, or operate under multiple aliases using writing style fingerprinting and activity pattern analysis.

---

## Architecture

Nemesis runs as a nine-container Docker stack on an isolated internal network.

```
nemesis-net (bridge network)
    |
    +-- nemesis-postgres     PostgreSQL 16       Source of truth for all data
    +-- nemesis-neo4j        Neo4j 5             Relationship graph projection
    +-- nemesis-redis        Redis 7             Job queue and state management
    +-- nemesis-tor          Tor daemon          SOCKS5 proxy on port 9050
    +-- nemesis-forum        Synthetic service   DarkGate Forum (controlled onion)
    +-- nemesis-market       Synthetic service   NightMarket (controlled onion)
    +-- nemesis-paste        Synthetic service   DeadDrop Paste (controlled onion)
    +-- nemesis-backend      FastAPI             Intelligence pipeline and REST API
    +-- nemesis-frontend     Nginx + React       Analyst dashboard
```

All inter-service communication happens over the internal Docker network. The backend is the only service that communicates with the Tor daemon, PostgreSQL, Neo4j, and Redis.

---

## How It Works

The pipeline runs in sequential stages triggered either manually from the dashboard or automatically when autonomous mode is enabled.

```
Sources (onion URLs)
    |
    v
Crawl Stage
    Playwright (headless Chromium over Tor SOCKS5)
    aiohttp (lightweight fallback for static pages)
    |
    v
Semantic DOM Parser
    HTML decomposed into structured blocks with XPath, char offsets, SHA-256 hash
    Raw HTML stored with content hash for tamper-evident evidence preservation
    |
    v
Intelligence Extraction
    LLM + rule-based + regex extraction pipeline
    Entities: handles, PGP keys, wallets, emails, onion addresses
    |
    v
Identity Correlation
    Persona candidate clustering
    Multi-factor evidence evaluation
    Actor derivation with attribution confidence scoring
    |
    v
Analysis Services (run in parallel)
    Infrastructure Analyzer
    Stylometry Service
    Behavioural Profiler
    |
    v
PostgreSQL (source of truth)
    |
    v
Neo4j (graph projection)
    |
    v
React Dashboard (analyst interface)
```

---

## Crawling and Collection

The collector (`backend/app/services/collector.py`) manages all page fetching using a two-path strategy.

**Playwright path**: For real dark web targets, Nemesis uses Playwright with a headless Chromium browser configured to route all traffic through the Tor SOCKS5 proxy at `socks5://tor:9050`. Playwright renders the full DOM including JavaScript-loaded content before capturing the HTML. This handles single-page applications, lazy-loaded forum threads, and JavaScript-gated content that raw HTTP clients cannot access.

**aiohttp path**: For simpler static pages or as a secondary path when needed, aiohttp with the aiohttp-socks connector routes requests through the same Tor proxy. This path is significantly faster for pages that do not require JavaScript execution.

The collector applies bounded crawling with configurable limits on depth, page count per source, and total runtime per job. Links are extracted separately from content using BeautifulSoup and queued for depth-based crawling. New onion addresses discovered in page content are automatically registered as sources and queued for future crawl jobs.

Each collected page is stored with a SHA-256 content hash to detect duplicates and provide a tamper-evident fingerprint linking every downstream intelligence finding back to the original raw HTML.

---

## Semantic Parsing

The semantic HTML parser (`backend/app/services/html_parser.py`) processes raw HTML into structured `SemanticBlock` objects. It strips boilerplate elements (scripts, navigation, footers, iframes) and decomposes meaningful DOM nodes into blocks classified by type: forum posts, seller profiles, product listings, PGP blocks, and contact information sections.

Each block carries:
- Block type classification
- Cleaned text content
- XPath and CSS selector coordinates
- Character start and end offsets within the original document
- DOM depth range
- SHA-256 block hash
- Authentic publication timestamp (extracted from the page where available)
- Sequence number (preserves reading order)

All blocks are persisted to the `semantic_blocks` table in PostgreSQL immediately after parsing, before any extraction is attempted.

---

## Intelligence Extraction

The extraction pipeline (`backend/app/services/extractor.py` and `backend/app/services/llm_adapter.py`) processes each semantic block to pull out threat indicators and establish relationships between them.

Extraction uses a layered approach combining three methods that operate together on each block.

**LLM extraction**: Blocks are sent to a Groq-hosted LLM (Qwen model) with a structured prompt asking it to identify entities and the relationships between them. The model returns structured JSON containing entities (handles, wallets, PGP fingerprints, email addresses, onion URLs) and attributed relationships (AUTHORED_BY, OWNS_WALLET, HAS_PGP, SAME_AS).

**Rule-based extraction**: A deterministic rule engine applies domain-specific logic to resolve attribution ambiguity. For example, it detects operator boundaries in forum thread structures, identifies document authors from known header patterns such as "Compiled by" or "Report by", and prevents cross-operator entity leakage when multiple actors appear in the same block.

**Regex extraction**: Pattern matching covers well-defined formats where structural recognition is more reliable than language reasoning — Bitcoin addresses (`bc1`, `1`, `3` prefixes), Monero addresses, PGP fingerprints (40-character hex), onion addresses (56-character base32), and structured email patterns.

Results from all three methods are merged, deduplicated, and stored per block. Each extracted entity mention records its exact character offsets within the original block, creating a four-level audit trail: raw HTML hash, block hash, entity mention offsets, and the relationship derived from those mentions.

Blocks are marked as processed individually and committed immediately after each block completes. If the pipeline is interrupted, it resumes from the last unprocessed block on the next run.

---

## Identity Correlation and Actor Derivation

The correlator (`backend/app/services/correlator.py`) runs after extraction is complete across all blocks from a crawl cycle.

**Persona candidate stage**: Every extracted handle is initially treated as a persona candidate, not a confirmed identity. Candidates are grouped using shared cryptographic and financial anchors — a shared PGP key, a shared cryptocurrency wallet, a shared email address, or mutual trust vouches — into persona clusters.

**Evidence weighting**: Each link type carries a different confidence weight. PGP key sharing carries the highest weight because private keys are rarely shared between independent operators. Wallet sharing carries high weight for the same reason. Orthographic similarity (usernames that are clearly variants of each other) carries lower weight and requires corroboration.

**Actor derivation**: A persona cluster is promoted to a confirmed Actor only when it meets a minimum evidence threshold across multiple independent signal types. A single handle with no corroborating evidence remains an observational persona candidate and is not promoted. Actors receive a category, attribution confidence score (capped at 0.92), last seen date, and a full list of linked identifiers.

All relationships are written to both PostgreSQL (as `Relationship` records with evidence) and projected to Neo4j for graph traversal and visualization.

---

## Infrastructure Analysis

The infrastructure analyzer (`backend/app/services/infrastructure_analyzer.py`) actively probes discovered onion services for misconfigurations that can expose the real-world origin of the server.

Probes include:
- Exposed server-status pages (`/server-status`, `/.git/HEAD`, `/.env`, `/phpinfo.php`, and similar)
- SSL certificate subjects — certificates tied to clearnet domain names create a direct link
- Default server banners that reveal software versions and hosting providers
- Favicon hash matching (JARM/JA3S fingerprinting) against known hosting infrastructure
- Certificate Transparency log queries (`crt.sh`) to find clearnet domains sharing the same certificate chain
- Shodan correlation for IP addresses appearing in SSL or DNS records

Each discovered infrastructure indicator is stored as an entity with a `HOSTED_ON` or `RESOLVES_TO` relationship, contributing to the actor attribution evidence chain.

---

## Stylometric Analysis

The stylometry service (`backend/app/services/stylometry.py`) builds writing style profiles for each confirmed actor and uses them to compare unknown text samples against known profiles.

**Traditional NLP feature extraction**: Implements a comprehensive forensic feature set without external NLP library dependencies.
- Function word frequency distributions across approximately 150 function words (pronouns, prepositions, conjunctions, auxiliary verbs, determiners)
- Character n-gram distributions (2-gram and 3-gram)
- Word n-gram distributions (unigram and bigram)
- Punctuation usage patterns and consecutive punctuation markers
- Sentence length statistics (mean, standard deviation, short/long sentence ratios)
- Word length distribution across four buckets
- Vocabulary richness metrics: Type-Token Ratio and Hapax Legomena ratio
- Capitalization patterns
- Rule-based part-of-speech tagging using suffix lists, producing POS bigram transition probabilities as a syntactic structure fingerprint

**Neural embedding engine**: Generates 128-dimensional linguistic embeddings. When the `sentence-transformers` library is available, it uses the `all-MiniLM-L6-v2` pretrained transformer model to encode text semantics. Otherwise, it applies a deterministic feature-hashing projection over character trigrams and function word frequencies with tanh normalization, producing stable embeddings without requiring a model download.

**Fusion matching**: The final similarity score combines traditional features (45%) and neural embeddings (55%) using cosine similarity and Manhattan proximity. Samples with fewer than 50 words receive a confidence penalty. Scores are categorised as Strong (0.80 and above), Probable (0.65 and above), or Candidate (below 0.65).

---

## Behavioural Profiling

The behavioural profiler (`backend/app/services/behavioral.py`) analyses activity timestamps collected from posts and listings to build circadian activity profiles for each actor.

Each post timestamp is binned into a 24-hour UTC histogram. The histogram is used to estimate the operator's likely timezone, identify peak activity windows, and detect cross-persona synchronicity — when two supposedly independent personas show statistically similar activity patterns, it is treated as a correlation signal.

Behavioural profiles contribute to the actor's overall attribution evidence alongside stylometric and cryptographic signals.

---

## Graph Database and Visualization

PostgreSQL serves as the single source of truth for all structured data. Neo4j receives a projected copy of all entity relationships for graph traversal and visualization.

The graph service (`backend/app/services/graph_service.py`) syncs entities and relationships to Neo4j after each pipeline run. Nodes represent actors, handles, wallets, PGP keys, emails, onion services, and infrastructure endpoints. Edges represent relationships such as AUTHORED_BY, OWNS_WALLET, HAS_PGP, SAME_AS, HOSTED_ON, and RESOLVES_TO.

The frontend graph page renders the Neo4j projection using a force-directed layout with actor-centric clustering, collision relaxation, and scroll-to-zoom navigation.

---

## Autonomous Mode

When autonomous mode is enabled from the Settings tab, a background daemon running inside the backend container wakes up at the configured interval (default 3600 seconds), crawls all active sources, runs the full extraction and correlation pipeline, and syncs the graph. The daemon state is persisted in Redis so it survives backend restarts.

The autonomous mode toggle in the frontend writes the state to the backend via `POST /api/settings/autonomous`, which stores it in Redis under the key `nemesis:autonomous_mode`. The daemon checks this key on each wake cycle and skips the cycle if the mode is off.

---

## Frontend and Dashboard

The frontend is a React application served by Nginx, communicating with the FastAPI backend over the internal Docker network.

Pages:
- **Dashboard** — live pipeline status, actor count, entity count, recent crawl activity, and a progress indicator showing each pipeline stage
- **Sources** — manage crawl targets, add new onion URLs, trigger individual or bulk crawls
- **Actors** — list of confirmed threat actor profiles with confidence scores, categories, linked identifiers, and last seen dates
- **Investigation** — query entities and relationships across a chosen timeline, filter by type and date range
- **Graph** — interactive force-directed relationship graph with actor-centric node clustering and full zoom/pan controls
- **Evidence** — raw evidence records linking each finding to its source block and original document
- **Timeline** — chronological view of intelligence events across all sources
- **Reports** — generate and export intelligence reports in CSV, JSON, and structured report formats
- **Settings** — infrastructure telemetry, pipeline controls, autonomous daemon toggle, and database maintenance

---

## Controlled Demonstration Environment

For demonstration and testing, three controlled synthetic onion services are included in the stack. These services simulate real dark web site types with seeded intelligence data.

**DarkGate Forum** (`nemesis-forum`) — a simulated dark web forum with threat actor posts discussing exploit code, PGP-signed messages, and migration announcements. Posts are attributed to handles including `shadowfox` and `nullbyte`.

**NightMarket** (`nemesis-market`) — a simulated dark web marketplace with vendor listings, cryptocurrency wallet addresses in BTC and XMR, and seller reputation data attributed to handles including `shadow_vendor` and `cryptosmith`.

**DeadDrop Paste** (`nemesis-paste`) — a simulated paste service hosting PGP public key blocks, cross-reference matrices linking handles across platforms, and signed communications attributed to `cipher_queen`.

These services run as Flask applications inside the Docker network and are accessible through the Tor daemon via their assigned onion addresses. They are intended for demonstration and development. The full intelligence pipeline processes them identically to real dark web targets.

---

## Real Darknet Usage

Nemesis is built to operate against real dark web sites. The Tor daemon running in the `nemesis-tor` container is a genuine Tor process with live circuit establishment. All crawl requests for real `.onion` addresses are routed through it using a SOCKS5 proxy connection.

To crawl a real dark web source, add its onion URL in the Sources page and trigger a crawl. The Playwright browser will connect through Tor, render the page, and pass the HTML through the full extraction pipeline. The intelligence schema is content-agnostic — it processes whatever the page returns regardless of source.

Practical considerations for real targets:
- Tor circuit establishment adds latency. Circuit build times vary based on relay availability and network conditions.
- Sites with authentication walls will return login pages. The pipeline will parse and store whatever HTML is returned.
- Sites using aggressive anti-scraping measures may return blocked responses. The headless browser configuration mimics a standard Tor Browser user agent.
- JavaScript-heavy single-page applications are fully supported through Playwright's DOM rendering.

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| Collection | Playwright (Chromium), aiohttp, aiohttp-socks | Page fetching over Tor SOCKS5 |
| Parsing | BeautifulSoup, lxml | HTML DOM decomposition |
| Extraction | Groq LLM (Qwen), regex, rule engine | Entity and relationship extraction |
| Stylometry | sentence-transformers, numpy, custom NLP | Writing style fingerprinting |
| Storage | PostgreSQL 16 | Source of truth |
| Graph | Neo4j 5 Community | Relationship projection |
| Queue | Redis 7 | Job management and daemon state |
| Proxy | Tor | SOCKS5 anonymity routing |
| Backend | FastAPI, SQLAlchemy async, asyncpg | REST API and pipeline orchestration |
| Frontend | React, TypeScript, Tailwind CSS, Vite | Analyst dashboard |
| Serving | Nginx | Frontend static serving |
| Runtime | Docker, Docker Compose | Containerized deployment |

---

## Setup and Deployment

Prerequisites: Docker Desktop with at least 4GB memory allocated, and Docker Compose.

Clone the repository and navigate to the project root.

Create an environment file from the example:

```
cp .env.example .env
```

Edit `.env` and set your API keys and passwords as needed.

Build and start all containers:

```
docker-compose up --build -d
```

Wait for all services to become healthy. The backend runs database migrations on first start.

Open the dashboard at `http://localhost:3000` and log in with the credentials configured in `.env` (default: `investigator` / `nemesis_admin_2026`).

Seed the controlled demonstration sources from the Settings tab by clicking "Seed Default Onion Targets", then click "Crawl All" from the Sources page to begin collection.

After the crawl completes, click "Run Correlation Pipeline" from the Settings tab to extract entities, correlate identities, and populate the graph.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `POSTGRES_USER` | PostgreSQL username | `nemesis` |
| `POSTGRES_PASSWORD` | PostgreSQL password | set in .env |
| `POSTGRES_DB` | PostgreSQL database name | `nemesis` |
| `NEO4J_AUTH` | Neo4j credentials (`user/pass` format) | set in .env |
| `NEO4J_PASSWORD` | Neo4j password (used by backend) | set in .env |
| `REDIS_HOST_PORT` | Host port for Redis | `16379` |
| `GROQ_API_KEY` | API key for LLM extraction | set in .env |
| `GROQ_MODEL` | LLM model identifier | `qwen/qwen3-8b` |
| `ADMIN_USERNAME` | Dashboard login username | `investigator` |
| `ADMIN_PASSWORD` | Dashboard login password | set in .env |
| `PLAYWRIGHT_ENABLED` | Enable headless browser scraping | `true` |
| `PLAYWRIGHT_TIMEOUT_MS` | Page load timeout in milliseconds | `30000` |
| `MAX_CRAWL_DEPTH` | Maximum link follow depth per crawl | `3` |
| `MAX_PAGES_PER_SOURCE` | Maximum pages collected per source | `50` |
| `CRAWL_INTERVAL_MINUTES` | Autonomous mode crawl interval | `60` |

---

## Project Structure

```
nemesis/
    backend/
        app/
            services/
                collector.py          Tor-aware crawler with Playwright and aiohttp
                html_parser.py        Semantic DOM decomposition
                extractor.py          Extraction pipeline orchestrator
                llm_adapter.py        LLM and rule-based entity extraction
                correlator.py         Identity clustering and actor derivation
                infrastructure_analyzer.py  Hidden service misconfiguration probing
                stylometry.py         Writing style fingerprinting
                behavioral.py         Activity pattern profiling
                graph_service.py      Neo4j sync and graph operations
                storage.py            Raw HTML persistence
            main.py                   FastAPI application and route definitions
            models.py                 SQLAlchemy ORM models
            schemas.py                Pydantic request/response schemas
            config.py                 Settings and environment variable loading
            database.py               Async database session management
            auth.py                   JWT authentication
        Dockerfile
        requirements.txt
    frontend/
        src/
            pages/                    Dashboard page components
            components/               Shared UI components
            api/                      Backend API client
        Dockerfile
        nginx.conf
    onion-services/
        forum/                        Synthetic DarkGate Forum
        market/                       Synthetic NightMarket
        paste/                        Synthetic DeadDrop Paste
        tor/                          Tor daemon with hidden service configuration
    docker-compose.yml
    .env.example
    SYSTEM_ANALYSIS.txt               Detailed technical system documentation
```

---

## Notes

The system is a research prototype. Attribution confidence scores represent the weight of collected evidence and should be treated as investigative leads rather than definitive conclusions. All intelligence findings should be verified through additional sources before operational use.

The controlled demonstration environment is seeded with synthetic data for testing and evaluation purposes. It does not represent real threat actors or real dark web activity.
