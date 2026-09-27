"""
Extraction Pipeline — Step 5 (LLM Extraction) & Step 6 (Normalize & Resolve).
Processes semantic blocks through LLM, stores raw outputs with cryptographic hashes,
resolves canonical entities & subtypes, and preserves entity mentions.
"""
import json
import hashlib
import logging
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import (
    Document, SemanticBlock, Extraction, Entity,
    Actor, Handle, PGPKey, Wallet, Infrastructure, EntityMention
)
from app.services.llm_adapter import LLMAdapter, PROMPT_VERSION, SCHEMA_VERSION, MODEL_NAME
from app.services.normalizer import IdentifierNormalizer

logger = logging.getLogger(__name__)


class ExtractionPipeline:
    def __init__(self):
        self.llm = LLMAdapter()
        self.normalizer = IdentifierNormalizer()

    async def process_document_blocks(self, document: Document, db: AsyncSession) -> Dict[str, Any]:
        """Process all semantic blocks of a document through LLM extraction and entity resolution"""
        # Fetch blocks for this document ordered by sequence_number
        result = await db.execute(
            select(SemanticBlock)
            .where(SemanticBlock.document_id == document.document_id)
            .order_by(SemanticBlock.sequence_number)
        )
        blocks = result.scalars().all()

        if not blocks:
            logger.warning(f"No semantic blocks found for document {document.document_id}")
            return {"status": "skipped", "reason": "no_blocks"}

        total_extractions = 0
        total_entities = 0
        total_mentions = 0
        extracted_relationships: List[Dict[str, Any]] = []

        for block in blocks:
            # 1. Run LLM Extraction (Step 5)
            try:
                # Fast path short non-informative blocks directly through heuristic
                if len(block.text_content.strip()) < 25:
                    extraction_data = self.llm._heuristic_extract(block.text_content, block.block_type or "general_content")
                else:
                    extraction_data = await self.llm.extract_semantic_block(
                        block.text_content,
                        block.block_type or "general_content"
                    )
            except Exception as e:
                logger.error(f"Extraction failed on block {block.block_id}: {e}")
                extraction_data = {"entities": [], "relationships": []}

            # 2. Store in extractions table
            raw_json_str = json.dumps(extraction_data, sort_keys=True)
            output_hash = hashlib.sha256(raw_json_str.encode("utf-8")).hexdigest()

            extraction_record = Extraction(
                block_id=block.block_id,
                model_name=MODEL_NAME,
                model_version="1.0",
                prompt_version=PROMPT_VERSION,
                schema_version=SCHEMA_VERSION,
                raw_output=extraction_data,
                output_hash=output_hash,
                extraction_status="success" if extraction_data.get("entities") else "empty"
            )
            db.add(extraction_record)
            await db.flush()
            total_extractions += 1

            # 3. Canonical Resolution & Subtype Storage (Step 6)
            entities_in_block = extraction_data.get("entities", [])
            mention_map = {}  # (entity_type, normalized_value) -> mention_id

            for item in entities_in_block:
                raw_val = str(item.get("normalized_value") or item.get("canonical_name") or "").strip()
                raw_type = str(item.get("entity_type") or "other").strip().lower()
                if not raw_val:
                    continue

                # Map variations to standard types
                if raw_type in ["username", "username_handle"]:
                    raw_type = "handle"
                elif raw_type in ["btc_address", "xmr_address", "eth_address"]:
                    raw_type = "wallet"
                elif raw_type in ["domain", "ip_address", "onion_url", "onion_service"]:
                    if raw_type == "onion_url":
                        raw_type = "onion_service"

                normalized_val = self.normalizer.normalize(raw_type, raw_val)
                canonical_name = item.get("canonical_name") or raw_val

                # Find or create Entity
                ent_res = await db.execute(
                    select(Entity).where(
                        and_(
                            Entity.entity_type == raw_type,
                            Entity.normalized_value == normalized_val
                        )
                    )
                )
                entity = ent_res.scalar_one_or_none()

                block_ts = block.created_at or datetime.utcnow()
                if not entity:
                    try:
                        async with db.begin_nested():
                            entity = Entity(
                                entity_type=raw_type,
                                canonical_name=canonical_name,
                                normalized_value=normalized_val,
                                first_seen_at=block_ts,
                                last_seen_at=block_ts
                            )
                            db.add(entity)
                            await db.flush()
                            total_entities += 1
                    except Exception:
                        ent_res = await db.execute(
                            select(Entity).where(
                                and_(
                                    Entity.entity_type == raw_type,
                                    Entity.normalized_value == normalized_val
                                )
                            )
                        )
                        entity = ent_res.scalar_one_or_none()
                else:
                    if entity.first_seen_at is None or block_ts < entity.first_seen_at:
                        entity.first_seen_at = block_ts
                    if entity.last_seen_at is None or block_ts > entity.last_seen_at:
                        entity.last_seen_at = block_ts
                    if canonical_name and not entity.canonical_name:
                        entity.canonical_name = canonical_name

                # Subtype tables
                attrs = item.get("attributes", {})
                await self._upsert_subtype(db, entity.entity_id, raw_type, normalized_val, attrs)

                # 4. Store entity mention
                ev_text = item.get("evidence_text") or raw_val
                ev_start = block.text_content.find(ev_text) if ev_text in block.text_content else 0
                ev_end = ev_start + len(ev_text) if ev_start >= 0 else 0

                mention = EntityMention(
                    entity_id=entity.entity_id,
                    block_id=block.block_id,
                    extraction_id=extraction_record.extraction_id,
                    evidence_text=ev_text,
                    evidence_start=ev_start,
                    evidence_end=ev_end,
                    extraction_confidence=item.get("confidence", 0.9),
                    created_at=block_ts
                )
                db.add(mention)
                await db.flush()
                total_mentions += 1
                mention_map[f"{raw_type}:{normalized_val}"] = str(mention.mention_id)

            # Collect relationships extracted from this block
            for rel in extraction_data.get("relationships", []):
                rel["block_id"] = block.block_id
                rel["mention_map"] = mention_map
                extracted_relationships.append(rel)

        document.is_processed = "true"
        await db.flush()

        return {
            "status": "success",
            "blocks_processed": len(blocks),
            "extractions_created": total_extractions,
            "entities_resolved": total_entities,
            "mentions_created": total_mentions,
            "relationships_found": len(extracted_relationships),
            "relationships": extracted_relationships
        }

    async def _upsert_subtype(
        self,
        db: AsyncSession,
        entity_id: str,
        entity_type: str,
        normalized_val: str,
        attrs: Dict[str, Any]
    ):
        """Create or update 1-to-1 subtype record for the entity"""
        try:
            async with db.begin_nested():
                if entity_type == "actor":
                    res = await db.execute(select(Actor).where(Actor.entity_id == entity_id))
                    if not res.scalar_one_or_none():
                        db.add(Actor(
                            entity_id=entity_id,
                            category=attrs.get("category", "threat_actor"),
                            description=attrs.get("description"),
                            attribution_confidence=attrs.get("attribution_confidence", 0.85)
                        ))
                elif entity_type == "handle":
                    res = await db.execute(select(Handle).where(Handle.entity_id == entity_id))
                    if not res.scalar_one_or_none():
                        db.add(Handle(
                            entity_id=entity_id,
                            handle=attrs.get("handle") or normalized_val,
                            platform=attrs.get("platform", "darknet")
                        ))
                elif entity_type == "pgp_key":
                    res = await db.execute(select(PGPKey).where(PGPKey.entity_id == entity_id))
                    if not res.scalar_one_or_none():
                        db.add(PGPKey(
                            entity_id=entity_id,
                            fingerprint=attrs.get("fingerprint") or normalized_val,
                            public_key=attrs.get("public_key")
                        ))
                elif entity_type == "wallet":
                    res = await db.execute(select(Wallet).where(Wallet.entity_id == entity_id))
                    if not res.scalar_one_or_none():
                        blockchain = attrs.get("blockchain")
                        if not blockchain:
                            blockchain = "BTC" if normalized_val.startswith(("1", "3", "bc1")) else "XMR"
                        db.add(Wallet(
                            entity_id=entity_id,
                            blockchain=blockchain,
                            address=attrs.get("address") or normalized_val
                        ))
                elif entity_type in ["infrastructure", "domain", "ip_address", "onion_service"]:
                    res = await db.execute(select(Infrastructure).where(Infrastructure.entity_id == entity_id))
                    if not res.scalar_one_or_none():
                        db.add(Infrastructure(
                            entity_id=entity_id,
                            infrastructure_type=attrs.get("infrastructure_type") or entity_type,
                            value=attrs.get("value") or normalized_val
                        ))
                await db.flush()
        except Exception:
            pass
