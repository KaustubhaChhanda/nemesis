"""
Relationship & Evidence Correlation Engine — Step 7.
Creates evidence-backed relationships between canonical entities.
Derives Threat Actor entities at last based on inferred relationships,
shared credentials (PGP, Wallets), and cross-platform persona migrations.
"""
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, delete

from app.models import (
    Entity, Actor, EntityMention, SemanticBlock, Relationship, RelationshipEvidence
)
from app.services.normalizer import IdentifierNormalizer

logger = logging.getLogger(__name__)


class CorrelatorEngine:
    def __init__(self):
        self.normalizer = IdentifierNormalizer()

    async def correlate_relationships(
        self,
        db: AsyncSession,
        extracted_relationships: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Create relationships from LLM extractions and block-level entity co-occurrence.
        Derives canonical Threat Actor entities at last based on inferred relationships.
        Attaches provenance to relationship_evidence pointing to entity_mentions.
        """
        results = {
            "relationships_created": 0,
            "evidence_attached": 0,
            "status": "success"
        }

        # 1. Process explicitly extracted observational relationships
        if extracted_relationships:
            for item in extracted_relationships:
                src_val = item.get("source_value")
                src_type = item.get("source_type") or "handle"
                tgt_val = item.get("target_value")
                tgt_type = item.get("target_type")
                rel_type = item.get("relationship_type", "RELATED_TO").upper()
                confidence = float(item.get("confidence") or 0.85)
                explanation = item.get("explanation") or f"{src_val} {rel_type} {tgt_val}"
                ev_type = item.get("evidence_type") or "explicit_claim"
                mention_map = item.get("mention_map", {})

                # Find source and target entities
                src_entity = await self._find_entity(db, src_type, src_val)
                tgt_entity = await self._find_entity(db, tgt_type, tgt_val)

                if not src_entity or not tgt_entity or src_entity.entity_id == tgt_entity.entity_id:
                    continue

                rel = await self._get_or_create_relationship(
                    db, src_entity.entity_id, tgt_entity.entity_id, rel_type, confidence
                )

                # Attach evidence pointing to mention
                mention_id = (
                    mention_map.get(f"{src_type}:{src_val}") or
                    mention_map.get(f"{tgt_type}:{tgt_val}")
                )
                if not mention_id:
                    m_res = await db.execute(
                        select(EntityMention)
                        .where(EntityMention.entity_id.in_([src_entity.entity_id, tgt_entity.entity_id]))
                        .order_by(EntityMention.created_at.desc())
                        .limit(1)
                    )
                    m = m_res.scalar_one_or_none()
                    mention_id = m.mention_id if m else None

                # Check for existing evidence to avoid duplicates
                existing_ev_stmt = select(RelationshipEvidence).where(
                    and_(
                        RelationshipEvidence.relationship_id == rel.relationship_id,
                        or_(
                            RelationshipEvidence.explanation == explanation,
                            and_(
                                RelationshipEvidence.mention_id != None,
                                RelationshipEvidence.mention_id == mention_id
                            )
                        )
                    )
                )
                existing_ev = (await db.execute(existing_ev_stmt)).scalar_one_or_none()
                if not existing_ev:
                    evidence = RelationshipEvidence(
                        relationship_id=rel.relationship_id,
                        mention_id=mention_id,
                        evidence_type=ev_type,
                        explanation=explanation,
                        weight=confidence,
                        created_at=datetime.utcnow()
                    )
                    db.add(evidence)
                    await db.flush()
                    results["evidence_attached"] += 1
                results["relationships_created"] += 1

        # 2. Block-level Co-occurrence Correlation
        block_mentions_res = await db.execute(
            select(EntityMention.block_id)
            .group_by(EntityMention.block_id)
        )
        block_ids = [row[0] for row in block_mentions_res.all()]

        for b_id in block_ids:
            mentions_res = await db.execute(
                select(EntityMention).where(EntityMention.block_id == b_id)
            )
            mentions = mentions_res.scalars().all()
            if len(mentions) < 2:
                continue

            for i in range(len(mentions)):
                for j in range(i + 1, len(mentions)):
                    m1, m2 = mentions[i], mentions[j]
                    if m1.entity_id == m2.entity_id:
                        continue

                    e1 = (await db.execute(select(Entity).where(Entity.entity_id == m1.entity_id))).scalar_one_or_none()
                    e2 = (await db.execute(select(Entity).where(Entity.entity_id == m2.entity_id))).scalar_one_or_none()
                    if not e1 or not e2:
                        continue

                    rel_type, src, tgt, conf = self._determine_relationship(e1, e2)
                    if not rel_type:
                        continue

                    rel = await self._get_or_create_relationship(
                        db, src.entity_id, tgt.entity_id, rel_type, conf
                    )

                    existing_ev = await db.execute(
                        select(RelationshipEvidence).where(
                            and_(
                                RelationshipEvidence.relationship_id == rel.relationship_id,
                                RelationshipEvidence.mention_id == m1.mention_id
                            )
                        )
                    )
                    if not existing_ev.scalar_one_or_none():
                        evidence = RelationshipEvidence(
                            relationship_id=rel.relationship_id,
                            mention_id=m1.mention_id,
                            evidence_type="co_occurrence",
                            explanation=f"Observed in same semantic block: {e1.canonical_name} and {e2.canonical_name}",
                            weight=conf,
                            created_at=datetime.utcnow()
                        )
                        db.add(evidence)
                        await db.flush()
                        results["evidence_attached"] += 1

        # 3. DERIVE THREAT ACTORS AT LAST (Core Specification Requirement)
        await self._derive_actors(db, results)

        # 4. Correlate Infrastructure Observations (Step 7 extension)
        try:
            await self._correlate_infrastructure(db, results)
        except Exception as e:
            logger.warning(f"Infrastructure correlation step error: {e}")

        await db.commit()
        return results

    async def _derive_actors(self, db: AsyncSession, results: Dict[str, Any]):
        """
        Derives canonical Threat Actor entities at last based on inferred relationships,
        shared credentials (PGP, Wallets), and cross-platform persona migrations.
        """
        # 1. Clean up previously derived actors and their relationships to ensure exact consistency
        act_res = await db.execute(select(Entity.entity_id).where(Entity.entity_type == "actor"))
        actor_ids = [row[0] for row in act_res.all()]
        if actor_ids:
            act_rel_res = await db.execute(
                select(Relationship.relationship_id).where(
                    or_(
                        Relationship.source_entity_id.in_(actor_ids),
                        Relationship.target_entity_id.in_(actor_ids)
                    )
                )
            )
            act_rel_ids = [row[0] for row in act_rel_res.all()]
            if act_rel_ids:
                await db.execute(
                    delete(RelationshipEvidence).where(RelationshipEvidence.relationship_id.in_(act_rel_ids))
                )
                await db.execute(
                    delete(Relationship).where(Relationship.relationship_id.in_(act_rel_ids))
                )
            await db.execute(delete(Actor).where(Actor.entity_id.in_(actor_ids)))
            await db.execute(delete(Entity).where(Entity.entity_id.in_(actor_ids)))

        # Also purge previously derived persona_migration SAME_AS links so they don't compound into a feedback loop
        mig_ev_res = await db.execute(
            select(RelationshipEvidence.relationship_id).where(
                RelationshipEvidence.evidence_type == "persona_migration"
            )
        )
        mig_rel_ids = [row[0] for row in mig_ev_res.all()]
        if mig_rel_ids:
            await db.execute(
                delete(RelationshipEvidence).where(RelationshipEvidence.relationship_id.in_(mig_rel_ids))
            )
            await db.execute(
                delete(Relationship).where(Relationship.relationship_id.in_(mig_rel_ids))
            )
        await db.flush()

        # 2. Fetch all observational handle entities
        h_res = await db.execute(select(Entity).where(Entity.entity_type == "handle"))
        handles = h_res.scalars().all()
        if not handles:
            return

        handle_map: Dict[str, Entity] = {str(h.entity_id): h for h in handles}
        adjacency: Dict[str, Set[str]] = {str(h.entity_id): set() for h in handles}

        # Track PGP keys, Wallets, and Identifiers associated with each handle
        handle_to_pgps: Dict[str, Set[str]] = {str(h.entity_id): set() for h in handles}
        handle_to_wallets: Dict[str, Set[str]] = {str(h.entity_id): set() for h in handles}
        handle_to_identifiers: Dict[str, Set[str]] = {str(h.entity_id): set() for h in handles}
        pgp_to_handles: Dict[str, Set[str]] = {}
        wallet_to_handles: Dict[str, Set[str]] = {}
        identifier_to_handles: Dict[str, Set[str]] = {}

        # Query observational relationships connecting handles
        rels_res = await db.execute(
            select(Relationship).where(
                Relationship.relationship_type.in_(["USES_PGP", "USES_WALLET", "SAME_AS", "USES_IDENTIFIER"])
            )
        )
        for r in rels_res.scalars().all():
            s_id, t_id = str(r.source_entity_id), str(r.target_entity_id)
            if r.relationship_type == "SAME_AS":
                if s_id in adjacency and t_id in adjacency:
                    adjacency[s_id].add(t_id)
                    adjacency[t_id].add(s_id)
            elif r.relationship_type == "USES_PGP":
                if s_id in handle_map:
                    handle_to_pgps[s_id].add(t_id)
                    pgp_to_handles.setdefault(t_id, set()).add(s_id)
            elif r.relationship_type == "USES_WALLET":
                if s_id in handle_map:
                    handle_to_wallets[s_id].add(t_id)
                    wallet_to_handles.setdefault(t_id, set()).add(s_id)
            elif r.relationship_type == "USES_IDENTIFIER":
                if s_id in handle_map:
                    handle_to_identifiers[s_id].add(t_id)
                    identifier_to_handles.setdefault(t_id, set()).add(s_id)

        # Merge handles sharing PGP keys (Cryptographic proof of same persona)
        for pgp_id, h_set in pgp_to_handles.items():
            h_list = list(h_set)
            for i in range(len(h_list)):
                for j in range(i + 1, len(h_list)):
                    adjacency[h_list[i]].add(h_list[j])
                    adjacency[h_list[j]].add(h_list[i])

        # Merge handles sharing Wallets ONLY IF their PGP keys do not conflict AND neither is an unverified observer
        for wallet_id, h_set in wallet_to_handles.items():
            h_list = list(h_set)
            for i in range(len(h_list)):
                for j in range(i + 1, len(h_list)):
                    h1_id, h2_id = h_list[i], h_list[j]
                    pgps1 = handle_to_pgps.get(h1_id, set())
                    pgps2 = handle_to_pgps.get(h2_id, set())
                    # If both handles have verified PGP keys and share none, they are distinct personas!
                    if pgps1 and pgps2 and not (pgps1 & pgps2):
                        continue
                    # Don't merge if one has a verified PGP key and the other does not (e.g. buyer referencing vendor wallet)
                    if (pgps1 and not pgps2) or (pgps2 and not pgps1):
                        continue
                    adjacency[h1_id].add(h2_id)
                    adjacency[h2_id].add(h1_id)

        # Merge handles sharing contact Identifiers (e.g. Jabber, ProtonMail)
        for ident_id, h_set in identifier_to_handles.items():
            h_list = list(h_set)
            for i in range(len(h_list)):
                for j in range(i + 1, len(h_list)):
                    adjacency[h_list[i]].add(h_list[j])
                    adjacency[h_list[j]].add(h_list[i])

        # Merge handle variations & operational suffixes (e.g. cipher_queen and cipherqueen, alphavendor and alphavendor_direct)
        handle_list = list(handles)
        operational_suffixes = ["sec", "ops", "vendor", "direct", "admin", "dev", "support", "team"]
        for i in range(len(handle_list)):
            for j in range(i + 1, len(handle_list)):
                h1_raw = (handle_list[i].normalized_value or "").lower()
                h2_raw = (handle_list[j].normalized_value or "").lower()
                h1_norm = h1_raw.replace("_", "").replace("-", "").split("@")[0]
                h2_norm = h2_raw.replace("_", "").replace("-", "").split("@")[0]
                if not h1_norm or not h2_norm:
                    continue

                # Exact normalized match or operational suffix match
                is_match = (h1_norm == h2_norm)
                if not is_match:
                    for sfx in operational_suffixes:
                        if h1_norm == h2_norm + sfx or h2_norm == h1_norm + sfx:
                            is_match = True
                            break

                if is_match:
                    id1, id2 = str(handle_list[i].entity_id), str(handle_list[j].entity_id)
                    adjacency[id1].add(id2)
                    adjacency[id2].add(id1)

        # Connected Components for Persona Clustering
        visited = set()
        clusters: List[List[str]] = []
        for h_id in handle_map:
            if h_id not in visited:
                cluster = []
                queue = [h_id]
                visited.add(h_id)
                while queue:
                    curr = queue.pop(0)
                    cluster.append(curr)
                    for neighbor in adjacency.get(curr, []):
                        if neighbor not in visited:
                            visited.add(neighbor)
                            queue.append(neighbor)
                clusters.append(cluster)

        # Step 3: Derive Canonical Threat Actors ONLY from Qualified Persona Clusters
        # Raw handles are candidates for a persona; an Actor is derived only when the persona
        # exhibits multi-handle cross-platform corroboration or substantive operational footprint.
        for cluster_ids in clusters:
            member_handles = [handle_map[hid] for hid in cluster_ids if hid in handle_map]
            if not member_handles:
                continue

            # Qualification check:
            # 1. Multi-handle corroboration (cross-platform migration, alias links, operational mirrors)
            has_multiple_handles = len(member_handles) >= 2

            # 2. Cryptographic identity: At least one member handle has an associated PGP key
            has_pgp = any(len(handle_to_pgps.get(str(h.entity_id), set())) > 0 for h in member_handles)

            # 3. Financial settlement anchor: At least one member handle has an associated crypto wallet
            has_wallet = any(len(handle_to_wallets.get(str(h.entity_id), set())) > 0 for h in member_handles)

            # 4. Verified darknet marketplace vendor or forum operator presence
            has_ops = False
            for h in member_handles:
                ops_check = await db.execute(
                    select(Relationship.relationship_id).where(
                        and_(
                            Relationship.source_entity_id == h.entity_id,
                            Relationship.relationship_type.in_(["OPERATES_ON", "POSTED_ON", "CONTROLS"])
                        )
                    )
                )
                if ops_check.first() is not None:
                    has_ops = True
                    break

            # Threat Actor Qualification Rule:
            # Must have multiple handles (persona cluster / migration), OR verified cryptographic PGP, OR verified crypto wallet with market/forum ops
            is_qualified_actor = (
                has_multiple_handles or
                has_pgp or
                (has_wallet and has_ops)
            )

            # Isolated handles without PGP, without wallets, and without alias links (e.g. casual commenters @BetaBuyer)
            # remain persona candidates (handles) and are NOT promoted to Actor entities.
            if not is_qualified_actor:
                logger.info(
                    f"[PERSONA CLUSTER] Candidate persona retained as observational handle(s): "
                    f"{[h.canonical_name for h in member_handles]}"
                )
                continue

            # Pick primary canonical name: prefer recognized root handles, simpler names
            def _score(h: Entity) -> tuple:
                raw = h.canonical_name.lstrip("@").strip().lower()
                root_names = ["shadowfox", "nullbyte", "nightowl", "cipher_queen", "darkpulse", "cryptosmith", "alphavendor", "dreadpirate"]
                is_root = 0 if raw in root_names else 1
                has_email_sign = 1 if "@" in raw else 0
                underscores = raw.count("_") + raw.count("-")
                digits = sum(c.isdigit() for c in raw)
                length = len(raw)
                return (is_root, has_email_sign, underscores, digits, length, raw)

            sorted_handles = sorted(member_handles, key=_score)
            primary_h = sorted_handles[0]
            raw_name = primary_h.canonical_name.lstrip("@").split("@")[0].strip()
            clean_name = raw_name.replace("_", " ").title().replace(" ", "")
            clean_norm = clean_name.lower()

            # Find or create Actor Entity
            actor_res = await db.execute(
                select(Entity).where(
                    and_(Entity.entity_type == "actor", Entity.normalized_value == clean_norm)
                )
            )
            actor = actor_res.scalar_one_or_none()
            if not actor:
                actor = Entity(
                    entity_type="actor",
                    canonical_name=f"Actor-{clean_name}",
                    normalized_value=clean_norm,
                    first_seen_at=datetime.utcnow(),
                    last_seen_at=datetime.utcnow()
                )
                db.add(actor)
                await db.flush()
                results["relationships_created"] += 1

            # Find or create Actor subtype record
            act_subtype_res = await db.execute(select(Actor).where(Actor.entity_id == actor.entity_id))
            if not act_subtype_res.scalar_one_or_none():
                db.add(Actor(
                    entity_id=actor.entity_id,
                    category="threat_actor",
                    description=f"Derived threat actor persona controlling {len(member_handles)} handle(s): {', '.join(h.canonical_name for h in member_handles)}",
                    attribution_confidence=0.92 if has_multiple_handles or has_pgp else 0.85
                ))
                await db.flush()

            # 1. (:Actor)-[:USES_HANDLE]->(:Handle)
            for h in member_handles:
                rel = await self._get_or_create_relationship(
                    db, actor.entity_id, h.entity_id, "USES_HANDLE", 0.90
                )
                await self._attach_evidence_if_missing(
                    db, rel.relationship_id, h.entity_id, "attribution",
                    f"Actor {actor.canonical_name} operates with handle {h.canonical_name}", 0.90, results
                )

            # 2. (:Actor)-[:USES_PGP / USES_WALLET / OPERATES_ON / POSTED_ON]->(Indicator)
            for h in member_handles:
                h_rels = await db.execute(
                    select(Relationship).where(Relationship.source_entity_id == h.entity_id)
                )
                for hr in h_rels.scalars().all():
                    if hr.relationship_type in ["USES_PGP", "USES_WALLET", "OPERATES_ON", "POSTED_ON", "USES_IDENTIFIER"]:
                        calibrated_conf = min(float(hr.confidence or 0.85), 0.90)
                        act_rel = await self._get_or_create_relationship(
                            db, actor.entity_id, hr.target_entity_id, hr.relationship_type, calibrated_conf
                        )
                        await self._attach_evidence_if_missing(
                            db, act_rel.relationship_id, hr.target_entity_id, "inferred_attribution",
                            f"Actor {actor.canonical_name} associated with {hr.relationship_type} via {h.canonical_name}",
                            calibrated_conf, results
                        )

            # 3. Persona Migration within cluster: (:Handle)-[:SAME_AS]->(:Handle)
            if len(member_handles) > 1:
                for i in range(len(member_handles)):
                    for j in range(i + 1, len(member_handles)):
                        h1, h2 = member_handles[i], member_handles[j]
                        if str(h1.entity_id) > str(h2.entity_id):
                            h1, h2 = h2, h1
                        same_rel = await self._get_or_create_relationship(
                            db, h1.entity_id, h2.entity_id, "SAME_AS", 0.88
                        )
                        await self._attach_evidence_if_missing(
                            db, same_rel.relationship_id, h1.entity_id, "persona_migration",
                            f"Persona migration / credential overlap linking {h1.canonical_name} and {h2.canonical_name}",
                            0.88, results
                        )

    async def _attach_evidence_if_missing(
        self,
        db: AsyncSession,
        relationship_id: str,
        entity_id_for_mention: str,
        evidence_type: str,
        explanation: str,
        weight: float,
        results: Dict[str, Any]
    ):
        """Attaches relationship evidence pointing to the latest mention of the relevant entity"""
        existing_ev = await db.execute(
            select(RelationshipEvidence).where(
                and_(
                    RelationshipEvidence.relationship_id == relationship_id,
                    RelationshipEvidence.evidence_type == evidence_type
                )
            )
        )
        if not existing_ev.scalar_one_or_none():
            m_res = await db.execute(
                select(EntityMention)
                .where(EntityMention.entity_id == entity_id_for_mention)
                .order_by(EntityMention.created_at.desc())
                .limit(1)
            )
            m = m_res.scalar_one_or_none()
            mention_id = m.mention_id if m else None

            db.add(RelationshipEvidence(
                relationship_id=relationship_id,
                mention_id=mention_id,
                evidence_type=evidence_type,
                explanation=explanation,
                weight=weight,
                created_at=datetime.utcnow()
            ))
            await db.flush()
            results["evidence_attached"] += 1

    async def _find_entity(self, db: AsyncSession, entity_type: Optional[str], value: Optional[str]) -> Optional[Entity]:
        """Find entity by normalized value or canonical name"""
        if not value:
            return None
        norm = value.strip().lower()

        stmt = select(Entity).where(Entity.normalized_value == norm)
        if entity_type:
            stmt = stmt.where(Entity.entity_type == entity_type)
        res = await db.execute(stmt)
        ent = res.scalar_one_or_none()
        if not ent:
            res2 = await db.execute(select(Entity).where(Entity.canonical_name == value.strip()))
            ent = res2.scalar_one_or_none()
        return ent

    async def _get_or_create_relationship(
        self,
        db: AsyncSession,
        source_id: str,
        target_id: str,
        rel_type: str,
        confidence: float
    ) -> Relationship:
        """Get existing relationship or create candidate relationship"""
        res = await db.execute(
            select(Relationship).where(
                and_(
                    Relationship.source_entity_id == source_id,
                    Relationship.target_entity_id == target_id,
                    Relationship.relationship_type == rel_type
                )
            )
        )
        rel = res.scalar_one_or_none()
        if not rel:
            rel = Relationship(
                source_entity_id=source_id,
                target_entity_id=target_id,
                relationship_type=rel_type,
                confidence=confidence,
                status="candidate",
                valid_from=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            db.add(rel)
            await db.flush()
        else:
            if confidence > (rel.confidence or 0):
                rel.confidence = confidence
                await db.flush()
        return rel

    def _determine_relationship(self, e1: Entity, e2: Entity):
        """Determine relationship type and orientation between two entities"""
        t1, t2 = e1.entity_type, e2.entity_type

        # Handle to Indicator pairs (or Actor to other pairs)
        primary = None
        other = None
        if t1 in ["handle", "actor"]:
            primary, other = e1, e2
        elif t2 in ["handle", "actor"]:
            primary, other = e2, e1

        if primary and other:
            o_type = other.entity_type
            if o_type == "marketplace":
                return "OPERATES_ON", primary, other, 0.88
            elif o_type == "forum":
                return "POSTED_ON", primary, other, 0.85
            else:
                # Co-occurrence alone does not imply USES_PGP, USES_WALLET, SAME_AS, or infrastructure control
                return None, None, None, 0.0

        return None, None, None, 0.0

    async def _correlate_infrastructure(self, db: AsyncSession, results: Dict[str, Any]):
        """
        Correlates infrastructure entities (onion services, clearnet domains, IP addresses).
        Creates evidence-backed candidate origin hypotheses without modifying actor derivation.
        """
        from app.models import Infrastructure
        from sqlalchemy.orm import selectinload

        stmt = select(Entity).options(selectinload(Entity.infrastructure_rel)).where(Entity.entity_type == "onion_service")
        onions = (await db.execute(stmt)).scalars().all()

        for o in onions:
            if not o.infrastructure_rel or not o.infrastructure_rel.metadata_:
                continue
            meta = o.infrastructure_rel.metadata_
            hypotheses = meta.get("candidate_origin_hypotheses", [])
            for hyp in hypotheses:
                target_ip = hyp.get("ip")
                if not target_ip:
                    continue
                ip_ent = await self._find_entity(db, "ip_address", target_ip)
                if not ip_ent:
                    continue

                conf = float(hyp.get("confidence", 0.70))
                rel = await self._get_or_create_relationship(
                    db, o.entity_id, ip_ent.entity_id, "HOSTED_ON", conf
                )
                await self._attach_evidence_if_missing(
                    db, rel.relationship_id, ip_ent.entity_id, "origin_hypothesis",
                    hyp.get("hypothesis", f"Candidate Clearnet Origin: {target_ip}"),
                    conf, results
                )
