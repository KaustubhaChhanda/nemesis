"""
Infrastructure Service — Passive extraction, enrichment, and correlation.
Handles domains, IP addresses, ports, certificates, server banners, and ASNs.
Per Section 15 of specification:
"Do not claim that an onion service's origin IP has been discovered merely
because a public clearnet infrastructure element looks similar.
Represent such findings as: infrastructure correlation, origin hypothesis, supporting evidence."
"""
import re
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import Infrastructure
from app.services.normalizer import IdentifierNormalizer

logger = logging.getLogger(__name__)


# Synthetic / passive enrichment mapping for darknet investigation fixtures
PASSIVE_DNS_MAP = {
    "secmail.pro": {
        "ip": "185.220.101.5",
        "asn": "AS200651",
        "org": "Flokinet Iceland / Privacy Hosting",
        "ct_logs": ["*.secmail.pro", "mail.secmail.pro", "mx.secmail.pro"],
        "ports": [25, 465, 587, 993, 443]
    },
    "dnmx.org": {
        "ip": "194.126.177.12",
        "asn": "AS49981",
        "org": "WorldStream B.V. / Anonymous Hosting",
        "ct_logs": ["*.dnmx.org", "dnmx.org", "smtp.dnmx.org"],
        "ports": [25, 80, 443, 993]
    },
    "protonmail.com": {
        "ip": "185.70.42.38",
        "asn": "AS62371",
        "org": "Proton AG / Switzerland",
        "ct_logs": ["*.protonmail.com", "mail.proton.me"],
        "ports": [443, 993]
    }
}


class InfrastructureService:
    """Manages infrastructure extraction, passive enrichment, and correlation"""

    def __init__(self):
        self.normalizer = IdentifierNormalizer()

    async def process_observation(
        self, db: AsyncSession, observation: Any
    ) -> Optional[Infrastructure]:
        """Convert relevant observation into an Infrastructure record"""
        infra_type = self._map_obs_type_to_infra(observation.observation_type)
        if not infra_type:
            return None

        normalized = self.normalizer.normalize(infra_type, observation.raw_value)

        # Check existing
        stmt = select(Infrastructure).where(
            and_(
                Infrastructure.type == infra_type,
                Infrastructure.normalized_value == normalized
            )
        )
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()

        metadata = self._enrich_metadata(infra_type, normalized)

        if not item:
            item = Infrastructure(
                type=infra_type,
                value=observation.raw_value,
                normalized_value=normalized,
                first_seen_at=datetime.utcnow(),
                last_seen_at=datetime.utcnow(),
                metadata_=metadata
            )
            db.add(item)
            await db.flush()
        else:
            item.last_seen_at = datetime.utcnow()
            if metadata and not item.metadata_:
                item.metadata_ = metadata

        # Run active scanner if this is an onion domain
        if infra_type == "domain" and normalized.endswith(".onion"):
            from app.services.scanner import ActiveInfraScanner
            scanner = ActiveInfraScanner()
            scan_results = await scanner.scan_onion(normalized)
            if scan_results:
                if not item.metadata_:
                    item.metadata_ = {}
                item.metadata_["active_scans"] = scan_results
                
                # Also create evidence records for misconfigurations
                from app.models import Evidence, TimelineEvent
                for result in scan_results:
                    # Create evidence of misconfig
                    evidence = Evidence(
                        type="infrastructure_misconfiguration",
                        description=f"{result.get('description')} found on {normalized}",
                        score=0.9
                    )
                    db.add(evidence)
                    
                    # Log to timeline
                    tl = TimelineEvent(
                        event_type="active_scan_hit",
                        event_time=datetime.utcnow(),
                        description=f"Active scan found {result.get('type')} on {normalized}: {result.get('value')}"
                    )
                    db.add(tl)
                await db.flush()

        # Link to observation
        link_stmt = select(InfrastructureObservation).where(
            and_(
                InfrastructureObservation.infrastructure_id == item.id,
                InfrastructureObservation.observation_id == observation.id
            )
        )
        existing_link = (await db.execute(link_stmt)).scalar_one_or_none()
        if not existing_link:
            link = InfrastructureObservation(
                infrastructure_id=item.id,
                observation_id=observation.id,
                relationship_type="observed_in",
                confidence=observation.confidence
            )
            db.add(link)
            await db.flush()

        return item

    def _map_obs_type_to_infra(self, obs_type: str) -> Optional[str]:
        mapping = {
            "domain": "domain",
            "ip_address": "ip_address",
            "ipv4": "ip_address",
            "port": "port",
            "certificate": "certificate",
            "asn": "asn",
        }
        return mapping.get(obs_type)

    def _enrich_metadata(self, infra_type: str, value: str) -> Dict[str, Any]:
        """Passive enrichment via passive DNS, ASN directory, and CT logs"""
        metadata = {}
        if infra_type == "domain":
            clean_domain = value.lower().strip()
            if clean_domain in PASSIVE_DNS_MAP:
                data = PASSIVE_DNS_MAP[clean_domain]
                metadata = {
                    "resolved_ip": data.get("ip"),
                    "asn": data.get("asn"),
                    "hosting_org": data.get("org"),
                    "ct_subdomains": data.get("ct_logs", []),
                    "common_ports": data.get("ports", []),
                    "enrichment_source": "Passive DNS / crt.sh CT Logs (simulated)",
                    "enrichment_status": "enriched"
                }
            else:
                metadata = {
                    "enrichment_source": "Passive DNS",
                    "enrichment_status": "pending_external"
                }

        elif infra_type == "ip_address":
            for domain, data in PASSIVE_DNS_MAP.items():
                if data.get("ip") == value:
                    metadata = {
                        "associated_domain": domain,
                        "asn": data.get("asn"),
                        "hosting_org": data.get("org"),
                        "enrichment_source": "Reverse IP / ASN Directory",
                        "enrichment_status": "enriched"
                    }
                    break
        elif infra_type == "port":
            port_num = int(value) if value.isdigit() else 0
            services = {22: "SSH", 25: "SMTP", 80: "HTTP", 443: "HTTPS", 993: "IMAPS", 9050: "Tor SOCKS"}
            if port_num in services:
                metadata = {"service_name": services[port_num]}

        return metadata

    async def scan_and_correlate_all(self, db: AsyncSession) -> Dict[str, int]:
        """Scan all relevant observations and build infrastructure correlations"""
        obs_stmt = select(Observation).where(
            Observation.observation_type.in_(["domain", "ip_address", "ipv4", "port", "certificate"])
        )
        obs_res = await db.execute(obs_stmt)
        observations = obs_res.scalars().all()

        processed = 0
        for obs in observations:
            res = await self.process_observation(db, obs)
            if res:
                processed += 1

        # Check for infrastructure co-occurrences (e.g. Clearnet domain mentioned alongside onion service)
        await self._build_infrastructure_correlations(db)

        await db.flush()
        return {"infrastructure_items_processed": processed}

    async def _build_infrastructure_correlations(self, db: AsyncSession):
        """Create hypothesis evidence when an infrastructure indicator links to darknet services"""
        infra_stmt = select(Infrastructure)
        infra_items = (await db.execute(infra_stmt)).scalars().all()

        for item in infra_items:
            # Check if this infrastructure has supporting observations
            obs_stmt = select(InfrastructureObservation).where(
                InfrastructureObservation.infrastructure_id == item.id
            )
            obs_links = (await db.execute(obs_stmt)).scalars().all()
            if len(obs_links) >= 1 and item.metadata_ and item.metadata_.get("resolved_ip"):
                # Create timeline event for infrastructure observation
                tl_event = TimelineEvent(
                    event_type="infrastructure_observed",
                    event_time=datetime.utcnow(),
                    description=f"Passive enrichment for {item.type} '{item.value}': IP {item.metadata_.get('resolved_ip')}, ASN {item.metadata_.get('asn', 'Unknown')}"
                )
                db.add(tl_event)
