"""
Discovery Service — Provider abstraction for intelligence search.
Implements DiscoveryProvider base class, LocalIndexProvider, and Query Normalizer.
Per Section 5.D of specification.
"""
import re
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models import Identifier, Actor, Observation, Page, Source
from app.services.llm_adapter import LLMAdapter

logger = logging.getLogger(__name__)


class DiscoveryProvider(ABC):
    """Abstract base class for discovery providers"""

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    async def search(self, normalized_query: Dict[str, Any], db: Optional[AsyncSession] = None) -> List[Dict[str, Any]]:
        pass


class LocalIndexProvider(DiscoveryProvider):
    """Searches across locally collected intelligence in PostgreSQL"""

    @property
    def name(self) -> str:
        return "LocalIndexProvider"

    @property
    def is_available(self) -> bool:
        return True

    async def search(self, normalized_query: Dict[str, Any], db: Optional[AsyncSession] = None) -> List[Dict[str, Any]]:
        if not db:
            return []

        results = []
        terms = normalized_query.get("terms", [])
        raw_query = normalized_query.get("raw_query", "")
        if not terms and raw_query:
            terms = [raw_query]

        search_tokens = set()
        for t in terms:
            for piece in t.lower().split():
                clean_piece = piece.strip('",;:.()')
                if len(clean_piece) > 1:
                    search_tokens.add(clean_piece)
        if raw_query:
            search_tokens.add(raw_query.lower())

        # 1. Search Identifiers
        id_conditions = []
        for token in search_tokens:
            id_conditions.append(Identifier.normalized_value.ilike(f"%{token}%"))
            id_conditions.append(Identifier.display_value.ilike(f"%{token}%"))

        if id_conditions:
            id_stmt = select(Identifier).where(or_(*id_conditions)).limit(25)
            id_res = await db.execute(id_stmt)
            for ident in id_res.scalars().all():
                exact = 1.0 if any(token == ident.normalized_value.lower() for token in search_tokens) else 0.85
                results.append({
                    "provider": self.name,
                    "type": "identifier",
                    "id": ident.id,
                    "title": f"{ident.type}: {ident.display_value or ident.normalized_value}",
                    "value": ident.normalized_value,
                    "relevance": exact,
                    "metadata": {"type": ident.type, "first_seen": ident.first_seen_at.isoformat() if ident.first_seen_at else None}
                })

        # 2. Search Actors
        actor_conditions = []
        for token in search_tokens:
            actor_conditions.append(Actor.label.ilike(f"%{token}%"))
            actor_conditions.append(Actor.description.ilike(f"%{token}%"))

        if actor_conditions:
            actor_stmt = select(Actor).where(or_(*actor_conditions)).limit(15)
            actor_res = await db.execute(actor_stmt)
            for actor in actor_res.scalars().all():
                exact = 0.95 if any(token in actor.label.lower() for token in search_tokens) else 0.8
                results.append({
                    "provider": self.name,
                    "type": "actor",
                    "id": actor.id,
                    "title": f"Actor: {actor.label}",
                    "value": actor.description or "Persona candidate cluster",
                    "relevance": exact,
                    "metadata": {"status": actor.status, "confidence": actor.confidence}
                })

        # 3. Search Observations
        obs_conditions = []
        for token in search_tokens:
            obs_conditions.append(Observation.raw_value.ilike(f"%{token}%"))
            obs_conditions.append(Observation.context.ilike(f"%{token}%"))

        if obs_conditions:
            obs_stmt = select(Observation).where(or_(*obs_conditions)).limit(25)
            obs_res = await db.execute(obs_stmt)
            for obs in obs_res.scalars().all():
                results.append({
                    "provider": self.name,
                    "type": "observation",
                    "id": obs.id,
                    "title": f"{obs.observation_type.upper()}: {obs.raw_value[:60]}",
                    "value": obs.context[:200] if obs.context else obs.raw_value,
                    "relevance": 0.75,
                    "metadata": {"extractor": obs.extractor, "page_id": obs.page_id, "confidence": obs.confidence}
                })

        # 4. Search Pages
        page_conditions = []
        for token in search_tokens:
            page_conditions.append(Page.title.ilike(f"%{token}%"))
            page_conditions.append(Page.content_text.ilike(f"%{token}%"))

        if page_conditions:
            page_stmt = select(Page).where(or_(*page_conditions)).limit(15)
            page_res = await db.execute(page_stmt)
            for page in page_res.scalars().all():
                results.append({
                    "provider": self.name,
                    "type": "page",
                    "id": page.id,
                    "title": page.title or page.url,
                    "value": page.url,
                    "relevance": 0.65,
                    "metadata": {"source_id": page.source_id, "collected_at": page.collected_at.isoformat() if page.collected_at else None}
                })

        return results


class AhmiaProvider(DiscoveryProvider):
    """Ahmia darknet search provider stub (demonstrating external provider capability)"""

    @property
    def name(self) -> str:
        return "AhmiaProvider"

    @property
    def is_available(self) -> bool:
        return False

    async def search(self, normalized_query: Dict[str, Any], db: Optional[AsyncSession] = None) -> List[Dict[str, Any]]:
        return []


class UserSubmittedProvider(DiscoveryProvider):
    """Provider for direct investigator submitted seeds and queries"""

    @property
    def name(self) -> str:
        return "UserSubmittedProvider"

    @property
    def is_available(self) -> bool:
        return True

    async def search(self, normalized_query: Dict[str, Any], db: Optional[AsyncSession] = None) -> List[Dict[str, Any]]:
        return []


class DiscoveryService:
    """Orchestrates query normalization and multi-provider dispatch"""

    def __init__(self):
        self.llm = LLMAdapter()
        self.providers: List[DiscoveryProvider] = [
            LocalIndexProvider(),
            UserSubmittedProvider(),
            AhmiaProvider(),
        ]

    async def normalize_query(self, query: str) -> Dict[str, Any]:
        """Convert natural language investigation query into structured terms and filters"""
        clean_q = query.strip()
        normalized = {
            "raw_query": clean_q,
            "terms": [clean_q],
            "identifier_types": [],
            "filters": {}
        }

        # Try LLM normalization if available
        try:
            llm_res = await self.llm.normalize_query(clean_q)
            if llm_res and isinstance(llm_res, dict) and "terms" in llm_res and llm_res["terms"]:
                normalized["terms"] = llm_res.get("terms", [clean_q])
                normalized["identifier_types"] = llm_res.get("identifier_types", [])
                normalized["filters"] = llm_res.get("filters", {})
                return normalized
        except Exception as e:
            logger.warning(f"LLM query normalization fallback: {e}")

        # Heuristic fallback
        terms = [clean_q]
        words = clean_q.split()
        for w in words:
            if w.startswith("@") or "@" in w or len(w) >= 20:
                terms.append(w.lstrip("@"))

        normalized["terms"] = list(dict.fromkeys(terms))
        return normalized

    async def discover(self, raw_query: str, db: AsyncSession) -> Dict[str, Any]:
        """Execute normalized discovery across all active providers"""
        normalized = await self.normalize_query(raw_query)

        all_results = []
        for provider in self.providers:
            if provider.is_available:
                try:
                    res = await provider.search(normalized, db)
                    all_results.extend(res)
                except Exception as e:
                    logger.error(f"Provider {provider.name} error: {e}")

        # Sort by relevance descending
        all_results.sort(key=lambda x: x.get("relevance", 0.0), reverse=True)

        return {
            "query": raw_query,
            "normalized_query": normalized,
            "total": len(all_results),
            "results": all_results[:60]
        }
