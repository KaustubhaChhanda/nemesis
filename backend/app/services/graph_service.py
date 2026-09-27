"""
Neo4j Graph Projection Service — Step 8.
Neo4j is a derived projection of PostgreSQL.
Every node contains entity_id = PostgreSQL entities.entity_id.
Every relationship contains relationship_id, confidence, and status.
"""
import logging
from typing import Dict, List, Optional, Any
from neo4j import AsyncGraphDatabase
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import Entity, Relationship

logger = logging.getLogger(__name__)
settings = get_settings()

NODE_LABEL_MAP = {
    "actor": "Actor",
    "handle": "Handle",
    "pgp_key": "PGPKey",
    "wallet": "Wallet",
    "domain": "Domain",
    "ip_address": "IPAddress",
    "onion_service": "OnionService",
    "certificate": "Certificate",
    "port": "Port",
    "asn": "ASN",
    "marketplace": "Marketplace",
    "forum": "Forum",
    "post": "Post",
}


class GraphService:
    def __init__(self):
        self.driver = None

    async def connect(self):
        if not self.driver:
            self.driver = AsyncGraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password)
            )

    async def close(self):
        if self.driver:
            await self.driver.close()
            self.driver = None

    def _type_to_label(self, entity_type: str) -> str:
        """Map PostgreSQL entity_type to Neo4j node label"""
        return NODE_LABEL_MAP.get(entity_type.lower(), "Entity")

    async def project_from_postgres(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Synchronize canonical Entities and Relationships from PostgreSQL to Neo4j.
        Preserves entity_id and relationship_id for end-to-end traceability.
        """
        await self.connect()
        stats = {"nodes_projected": 0, "relationships_projected": 0}

        async with self.driver.session() as session:
            # 1. Fetch all entities with subtypes
            result = await db.execute(
                select(Entity).options(
                    selectinload(Entity.actor),
                    selectinload(Entity.handle_rel),
                    selectinload(Entity.pgp_key_rel),
                    selectinload(Entity.wallet_rel),
                    selectinload(Entity.infrastructure_rel)
                )
            )
            entities = result.scalars().all()

            # Ensure uniqueness constraint on entity_id for fast MERGE
            try:
                await session.run("CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (n:Entity) REQUIRE n.entity_id IS UNIQUE")
                await session.run("MATCH ()-[r:CONTROLS]->() DELETE r")
            except Exception:
                pass

            for ent in entities:
                label = self._type_to_label(ent.entity_type)
                props: Dict[str, Any] = {
                    "entity_id": str(ent.entity_id),
                    "canonical_name": ent.canonical_name or ent.normalized_value,
                    "normalized_value": ent.normalized_value,
                    "entity_type": ent.entity_type,
                    "first_seen_at": ent.first_seen_at.isoformat() if ent.first_seen_at else None,
                    "last_seen_at": ent.last_seen_at.isoformat() if ent.last_seen_at else None,
                }

                # Attach subtype attributes
                if ent.actor:
                    props["category"] = ent.actor.category
                    props["attribution_confidence"] = float(ent.actor.attribution_confidence or 0.8)
                if ent.handle_rel:
                    props["handle"] = ent.handle_rel.handle
                    props["platform"] = ent.handle_rel.platform
                if ent.pgp_key_rel:
                    props["fingerprint"] = ent.pgp_key_rel.fingerprint
                if ent.wallet_rel:
                    props["blockchain"] = ent.wallet_rel.blockchain
                    props["address"] = ent.wallet_rel.address
                if ent.infrastructure_rel:
                    props["infrastructure_type"] = ent.infrastructure_rel.infrastructure_type
                    props["value"] = ent.infrastructure_rel.value
                    meta = ent.infrastructure_rel.metadata_ or {}
                    if meta.get("asn"):
                        props["asn"] = meta.get("asn")
                    if meta.get("org") or meta.get("hosting_org"):
                        props["org"] = meta.get("org") or meta.get("hosting_org")
                    if meta.get("http_probe", {}).get("server_banner"):
                        props["server_banner"] = meta.get("http_probe", {}).get("server_banner")
                    if meta.get("jarm"):
                        props["jarm"] = meta.get("jarm")
                    if meta.get("ports"):
                        props["ports"] = str(meta.get("ports"))
                    if meta.get("leaks_detected"):
                        props["leaks_count"] = len(meta.get("leaks_detected"))

                # Cypher MERGE statement with specific label + Entity label
                query = f"""
                MERGE (n:{label} {{entity_id: $entity_id}})
                SET n += $props, n:Entity
                """
                await session.run(query, entity_id=str(ent.entity_id), props=props)
                stats["nodes_projected"] += 1

            # 2. Fetch all relationships
            rel_result = await db.execute(select(Relationship))
            relationships = rel_result.scalars().all()

            for rel in relationships:
                # Sanitize relationship type for Cypher
                rel_type = rel.relationship_type.upper().replace("-", "_").replace(" ", "_")
                if not rel_type.isidentifier():
                    rel_type = "RELATED_TO"

                rel_props = {
                    "relationship_id": str(rel.relationship_id),
                    "confidence": float(rel.confidence or 0.8),
                    "status": rel.status or "candidate",
                    "valid_from": rel.valid_from.isoformat() if rel.valid_from else None,
                }

                # Project edge between matching nodes using entity_id
                rel_query = f"""
                MATCH (s:Entity {{entity_id: $source_id}})
                MATCH (t:Entity {{entity_id: $target_id}})
                MERGE (s)-[r:{rel_type} {{relationship_id: $relationship_id}}]->(t)
                SET r.confidence = $confidence,
                    r.status = $status,
                    r.valid_from = $valid_from
                """
                await session.run(
                    rel_query,
                    source_id=str(rel.source_entity_id),
                    target_id=str(rel.target_entity_id),
                    relationship_id=str(rel.relationship_id),
                    confidence=rel_props["confidence"],
                    status=rel_props["status"],
                    valid_from=rel_props["valid_from"]
                )
                stats["relationships_projected"] += 1

            # 3. Prune obsolete entities and relationships from Neo4j to maintain perfect sync
            valid_ids = [str(ent.entity_id) for ent in entities]
            if valid_ids:
                await session.run("MATCH (n:Entity) WHERE NOT n.entity_id IN $valid_ids DETACH DELETE n", valid_ids=valid_ids)
            else:
                await session.run("MATCH (n:Entity) DETACH DELETE n")

            valid_rel_ids = [str(rel.relationship_id) for rel in relationships]
            if valid_rel_ids:
                await session.run("MATCH ()-[r]->() WHERE r.relationship_id IS NOT NULL AND NOT r.relationship_id IN $valid_rel_ids DELETE r", valid_rel_ids=valid_rel_ids)
            else:
                await session.run("MATCH ()-[r]->() WHERE r.relationship_id IS NOT NULL DELETE r")

        logger.info(f"Neo4j projection complete: {stats}")
        return stats

    async def get_graph_data(self, actor_id: Optional[str] = None, depth: int = 2) -> Dict[str, Any]:
        """Retrieve graph projection data for visualization"""
        await self.connect()
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []
        seen_nodes = set()
        seen_edges = set()

        async with self.driver.session() as session:
            if actor_id:
                query = """
                MATCH path = (root:Entity {entity_id: $actor_id})-[*0..2]-(m:Entity)
                UNWIND nodes(path) AS n
                OPTIONAL MATCH (n)-[r]->(target:Entity)
                WHERE target IN nodes(path)
                RETURN n, r, target AS m
                LIMIT 500
                """
                result = await session.run(query, actor_id=actor_id)
            else:
                query = """
                MATCH (n:Entity)
                OPTIONAL MATCH (n)-[r]->(m:Entity)
                RETURN n, r, m
                LIMIT 500
                """
                result = await session.run(query)

            async for record in result:
                n = record["n"]
                if n and n.get("entity_id") not in seen_nodes:
                    seen_nodes.add(n.get("entity_id"))
                    label = next((lbl for lbl in n.labels if lbl != "Entity"), "Entity")
                    nodes.append({
                        "id": n.get("entity_id"),
                        "label": n.get("canonical_name") or n.get("normalized_value"),
                        "type": label,
                        "properties": dict(n)
                    })

                m = record["m"]
                if m and m.get("entity_id") not in seen_nodes:
                    seen_nodes.add(m.get("entity_id"))
                    label = next((lbl for lbl in m.labels if lbl != "Entity"), "Entity")
                    nodes.append({
                        "id": m.get("entity_id"),
                        "label": m.get("canonical_name") or m.get("normalized_value"),
                        "type": label,
                        "properties": dict(m)
                    })

                r = record["r"]
                if r and n and m:
                    rel_id = r.get("relationship_id") or f"{n.get('entity_id')}_{m.get('entity_id')}_{r.type}"
                    if rel_id not in seen_edges:
                        seen_edges.add(rel_id)
                        edges.append({
                            "id": rel_id,
                            "source": n.get("entity_id"),
                            "target": m.get("entity_id"),
                            "relationship": r.type,
                            "type": r.type,
                            "confidence": r.get("confidence"),
                            "status": r.get("status", "candidate"),
                            "properties": dict(r)
                        })

        return {"nodes": nodes, "edges": edges}
