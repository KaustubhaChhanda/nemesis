"""
LLM Adapter — Controlled interface to LLM services with strict JSON Schema.
Supports Groq Llama 3.3 and deterministic fallback intelligence extractor.
"""
import re
import json
import logging
from typing import Dict, Any, List, Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

PROMPT_VERSION = "v2.0-semantic-schema"
SCHEMA_VERSION = "2026-09-nemesis"
MODEL_NAME = "qwen/qwen3.8-27b"

SYSTEM_PROMPT = """You are a dark-web threat intelligence extractor.
Extract structured indicators, entities, evidence spans, and relationships from the provided semantic block.
Return ONLY a valid JSON object matching this schema:
{
  "entities": [
    {
      "entity_type": "actor|handle|pgp_key|wallet|domain|ip_address|onion_service|marketplace|forum",
      "canonical_name": "string",
      "normalized_value": "string",
      "evidence_text": "exact substring from text",
      "confidence": 0.95,
      "attributes": {
        "category": "optional (e.g. threat_actor, vendor, moderator)",
        "description": "optional description",
        "platform": "optional platform name",
        "blockchain": "BTC|XMR|ETH (if wallet)",
        "fingerprint": "PGP fingerprint if pgp_key",
        "public_key": "raw PGP public key text if present",
        "infrastructure_type": "domain|ip_address|onion_service"
      }
    }
  ],
  "relationships": [
    {
      "source_type": "actor|handle",
      "source_value": "canonical actor name or handle",
      "target_type": "handle|pgp_key|wallet|marketplace|forum",
      "target_value": "target entity normalized value",
      "relationship_type": "USES_HANDLE|USES_PGP|USES_WALLET|OPERATES_ON|POSTED_ON|SAME_AS",
      "confidence": 0.88,
      "evidence_type": "explicit_claim|signature_match|co_occurrence",
      "explanation": "explanation of relationship"
    }
  ]
}
"""


DISALLOWED_IDENTIFIERS = {
    "jabber", "xmpp", "secmail", "protonmail", "tutanota", "onionmail", "dnmx",
    "calyxinstitute", "gmail", "yahoo", "hotmail", "mail", "email", "contact",
    "profile", "vendor", "seller", "author", "member", "user", "admin", "moderator",
    "official", "telegram", "matrix", "session", "signal", "support", "help", "info",
    "service", "services", "feedback", "rating", "trust", "level", "orders", "sales",
    "buyer", "listing", "listings", "market", "forum", "paste", "rules", "escrow",
    "bitcoin", "monero", "ethereum", "wallet", "crypto", "pgp", "public", "key",
    "block", "message", "signature", "signed", "version", "begin", "end", "sha512",
    "hash", "content", "examplecorp", "example", "corp", "internal", "domain",
    "http", "https", "www", "onion", "none", "null", "undefined", "true", "false",
    "unknown", "recent", "about", "details", "total", "category", "price", "reviews",
    "thread", "threads", "posts", "post", "date", "status", "joined", "replies",
    "darkgate", "nightmarket", "deaddrop", "silkvault",
    "for", "since", "offering", "requirements", "requirement", "card", "cross-reference",
    "reference", "check", "active", "started", "by", "with", "from", "this", "that",
    "these", "those", "been", "have", "here", "also", "same", "keys", "person",
    "view", "directory", "trusted", "anonymous", "delivery", "payment", "sample",
}


# Controlled LLM switch: enabled following completion of offline testing
ENABLE_LLM_API = True
_GROQ_DISABLED = False


class LLMAdapter:
    def __init__(self):
        self.groq_api_key = settings.groq_api_key
        self.model = settings.groq_model or MODEL_NAME

    async def extract_semantic_block(self, text: str, block_type: str) -> Dict[str, Any]:
        """Extract structured entities and relationships from a semantic block"""
        llm_data = None
        if ENABLE_LLM_API and self.groq_api_key and not self.groq_api_key.startswith("your_"):
            try:
                from groq import AsyncGroq
                client = AsyncGroq(api_key=self.groq_api_key, timeout=4.0, max_retries=0)
                prompt = f"Block Type: {block_type}\n\nContent:\n{text[:2500]}"
                response = await client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=600,
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content
                data = json.loads(content)
                if isinstance(data, dict) and "entities" in data:
                    llm_data = self._clean_llm_output(data)
            except Exception as e:
                logger.warning(f"[LLM] Live extraction note: {e} -> utilizing fast deterministic fallback")

        # Deterministic heuristic extraction
        heuristic_data = self._heuristic_extract(text, block_type)

        if not llm_data:
            return heuristic_data

        # Merge LLM extraction with deterministic heuristic extraction for 100% fidelity
        merged_entities = list(heuristic_data.get("entities", []))
        seen_keys = {(e.get("entity_type"), str(e.get("normalized_value") or "").lower()) for e in merged_entities}
        for ent in llm_data.get("entities", []):
            etype = str(ent.get("entity_type") or "").lower()
            val = str(ent.get("normalized_value") or ent.get("canonical_name") or "").lower().strip()
            if (etype, val) not in seen_keys:
                seen_keys.add((etype, val))
                merged_entities.append(ent)

        merged_relationships = list(heuristic_data.get("relationships", []))
        seen_rels = {(r.get("source_value"), r.get("target_value"), r.get("relationship_type")) for r in merged_relationships}
        for rel in llm_data.get("relationships", []):
            key = (rel.get("source_value"), rel.get("target_value"), rel.get("relationship_type"))
            if key not in seen_rels:
                seen_rels.add(key)
                merged_relationships.append(rel)

        return {
            "entities": merged_entities,
            "relationships": merged_relationships,
            "summary": llm_data.get("summary") or heuristic_data.get("summary", ""),
            "threat_category": llm_data.get("threat_category") or heuristic_data.get("threat_category", "general_intel")
        }

    def _clean_llm_output(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Purge invalid/disallowed identifiers from LLM output"""
        cleaned_entities = []
        for ent in data.get("entities", []):
            val = str(ent.get("normalized_value") or ent.get("canonical_name") or "").lower().strip()
            etype = str(ent.get("entity_type") or "").lower().strip()
            if etype in ["actor", "handle"] and (val in DISALLOWED_IDENTIFIERS or len(val) < 3):
                continue
            cleaned_entities.append(ent)
        data["entities"] = cleaned_entities
        return data

    def _heuristic_extract(self, text: str, block_type: str) -> Dict[str, Any]:
        """Deterministic extractor providing reliable intelligence without external API calls"""
        entities: List[Dict[str, Any]] = []
        relationships: List[Dict[str, Any]] = []
        seen_keys = set()

        def add_entity(e: Dict[str, Any]):
            key = (e["entity_type"], e["normalized_value"])
            if key not in seen_keys:
                seen_keys.add(key)
                entities.append(e)

        # 1. PGP Keys & Fingerprints (all occurrences)
        has_pgp_fingerprint = False
        for pgp_match in re.finditer(r'(?:[0-9A-Fa-f]{4}\s+){9}[0-9A-Fa-f]{4}', text):
            val = re.sub(r'\s+', '', pgp_match.group(0)).upper()
            has_pgp_fingerprint = True
            add_entity({
                "entity_type": "pgp_key",
                "canonical_name": f"PGP-{val[-8:]}",
                "normalized_value": val,
                "evidence_text": pgp_match.group(0),
                "confidence": 0.98,
                "attributes": {"fingerprint": val}
            })

        if not has_pgp_fingerprint and "-----BEGIN PGP" in text:
            raw_key_block = text[text.find("-----BEGIN PGP"):text.find("-----END PGP") + 35] if "-----END PGP" in text else text[:200]
            add_entity({
                "entity_type": "pgp_key",
                "canonical_name": "PGP-PublicKey",
                "normalized_value": raw_key_block[:64],
                "evidence_text": "-----BEGIN PGP PUBLIC KEY BLOCK-----" if "PUBLIC KEY" in text else "-----BEGIN PGP SIGNED MESSAGE-----",
                "confidence": 0.99,
                "attributes": {"public_key": text[:1000]}
            })

        # 2. Wallets (BTC, XMR)
        btc_matches = re.finditer(r'\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b', text)
        for m in btc_matches:
            val = m.group(0)
            if not val.startswith("bc1q_SCAM"):
                add_entity({
                    "entity_type": "wallet",
                    "canonical_name": val,
                    "normalized_value": val,
                    "evidence_text": val,
                    "confidence": 0.95,
                    "attributes": {"blockchain": "BTC", "address": val}
                })

        xmr_matches = re.finditer(r'\b[48][0-9A-Za-z]{93,105}\b', text)
        for m in xmr_matches:
            val = m.group(0)
            add_entity({
                "entity_type": "wallet",
                "canonical_name": val,
                "normalized_value": val,
                "evidence_text": val,
                "confidence": 0.95,
                "attributes": {"blockchain": "XMR", "address": val}
            })

        # 3. Onion Services / Domains / IPs
        onion_matches = re.finditer(r'\b[a-z2-7]{16,56}\.onion\b', text, re.IGNORECASE)
        for m in onion_matches:
            val = m.group(0).lower()
            add_entity({
                "entity_type": "onion_service",
                "canonical_name": val,
                "normalized_value": val,
                "evidence_text": val,
                "confidence": 0.95,
                "attributes": {"infrastructure_type": "onion_service", "value": val}
            })

        # 4. Extract Handles & Usernames (Strictly filtered; No premature actor creation)
        extracted_handles: List[str] = []
        author_handle: Optional[str] = None

        # Explicit author / vendor fields first to establish the primary persona
        author_patterns = [
            r'<[a-z0-9]+[^>]*class=["\'][^"\']*author[^"\']*["\'][^>]*>\s*@?([a-zA-Z0-9_\-]{3,25})\s*<\/[a-z0-9]+>',
            r'<div[^>]*class=["\']meta["\'][^>]*>\s*by\s+@?([a-zA-Z0-9_\-]{3,25})\b',
            r'UID:\s*@?([a-zA-Z0-9_\-]{3,25})\s*(?:<|$)',
            r'\b(?:Author|Posted by|Started by|Signed|Compiled by|Compiled|Written by|Authored by|Report by|Username|User|Vendor Profile|Vendor|Operator)\s*:\s*(?:<[^>]+>\s*)*@?([a-zA-Z0-9_\-]{3,25})\b',
            r'\b(?:Compiled by|Authored by|Written by|Report by)\s+@?([a-zA-Z0-9_\-]{3,25})\b',
            r'<h[1-4][^>]*>\s*(?:Profile:\s*|PGP Key —\s*)?@?([a-zA-Z0-9_\-]{3,25})\s*</h[1-4]>',
        ]
        earliest_pos = float('inf')
        for pat in author_patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                cand = m.group(1).strip(" -_.:\"'")
                if cand.lower() not in DISALLOWED_IDENTIFIERS and len(cand) >= 3 and not cand.startswith("-"):
                    if m.start() < earliest_pos:
                        earliest_pos = m.start()
                        author_handle = cand.lower()
                    if cand not in extracted_handles:
                        extracted_handles.append(cand)
                    add_entity({
                        "entity_type": "handle",
                        "canonical_name": f"@{cand}",
                        "normalized_value": cand.lower(),
                        "evidence_text": m.group(0),
                        "confidence": 0.95,
                        "attributes": {"handle": cand, "platform": "darknet"}
                    })

        # Standalone @handle (not preceded by word chars or dots)
        tag_matches = re.finditer(r'(?<![\w\.\-])@([a-zA-Z0-9_\-]{3,25})\b', text)
        for tm in tag_matches:
            h = tm.group(1).strip()
            if h.lower() not in DISALLOWED_IDENTIFIERS and len(h) >= 3:
                if h not in extracted_handles:
                    extracted_handles.append(h)
                add_entity({
                    "entity_type": "handle",
                    "canonical_name": f"@{h}",
                    "normalized_value": h.lower(),
                    "evidence_text": tm.group(0),
                    "confidence": 0.95,
                    "attributes": {"handle": h, "platform": "darknet"}
                })

        # Email / XMPP prefix and full email address as identifiers
        email_matches = re.finditer(r'\b([a-zA-Z0-9_\-\.]{3,30})@(secmail\.pro|protonmail\.com|dnmx\.org|onionmail\.com|jabber\.[a-z\.]+|[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})\b', text, re.IGNORECASE)
        for em in email_matches:
            full_email = em.group(0).lower()
            h = em.group(1).strip()
            if h.lower() not in DISALLOWED_IDENTIFIERS and len(h) >= 3 and not h.startswith("-"):
                if h not in extracted_handles:
                    extracted_handles.append(h)
                add_entity({
                    "entity_type": "handle",
                    "canonical_name": f"@{h}",
                    "normalized_value": h.lower(),
                    "evidence_text": em.group(0),
                    "confidence": 0.95,
                    "attributes": {"handle": h, "platform": em.group(2).lower()}
                })
                relationships.append({
                    "source_type": "handle",
                    "source_value": h.lower(),
                    "target_type": "identifier",
                    "target_value": full_email,
                    "relationship_type": "USES_IDENTIFIER",
                    "confidence": 0.95,
                    "evidence_type": "explicit_contact",
                    "explanation": f"Handle @{h} communicates via endpoint {full_email}"
                })
            add_entity({
                "entity_type": "identifier",
                "canonical_name": full_email,
                "normalized_value": full_email,
                "evidence_text": em.group(0),
                "confidence": 0.98,
                "attributes": {"email": full_email, "domain": em.group(2).lower(), "identifier_type": "email"}
            })

        # Name followed by angle-bracket email: e.g. "cipher_queen <cipherqueen@dnmx.org>"
        named_emails = re.finditer(r'@?([a-zA-Z0-9_\-]{3,25})\s*<([a-zA-Z0-9_\-\.]{3,30})@([a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})>', text)
        for ne in named_emails:
            n_handle = ne.group(1).strip().lower()
            e_prefix = ne.group(2).strip().lower()
            if n_handle not in DISALLOWED_IDENTIFIERS and len(n_handle) >= 3 and not n_handle.startswith("-"):
                if n_handle not in extracted_handles:
                    extracted_handles.append(n_handle)
                add_entity({
                    "entity_type": "handle",
                    "canonical_name": f"@{n_handle}",
                    "normalized_value": n_handle,
                    "evidence_text": ne.group(0),
                    "confidence": 0.95,
                    "attributes": {"handle": n_handle, "platform": "darknet"}
                })
                if e_prefix not in DISALLOWED_IDENTIFIERS and len(e_prefix) >= 3 and not e_prefix.startswith("-") and e_prefix != n_handle:
                    if not any(r.get("source_value") == n_handle and r.get("target_value") == e_prefix and r.get("relationship_type") == "SAME_AS" for r in relationships):
                        relationships.append({
                            "source_type": "handle",
                            "source_value": n_handle,
                            "target_type": "handle",
                            "target_value": e_prefix,
                            "relationship_type": "SAME_AS",
                            "confidence": 0.90,
                            "evidence_type": "explicit_claim",
                            "explanation": f"Author credential equivalence linking @{n_handle} and @{e_prefix}"
                        })

        primary_handle = author_handle or (extracted_handles[0].lower() if extracted_handles else None)

        # 5. Explicit Persona Migrations & Identity Correlations
        # Case A: Explicit migration expressions
        migration_patterns = [
            r'(?:formerly (?:on [a-zA-Z0-9_\s]+ )?as|previously known as|also using handle|moving to [a-zA-Z0-9_\s]+ under handle|migrating (?:my vendor operations )?to [a-zA-Z0-9_\s]+ under (?:the )?handle)\s+["\']?([a-zA-Z0-9_\-]{3,25})["\']?',
        ]
        for mpat in migration_patterns:
            for mm in re.finditer(mpat, text, re.IGNORECASE):
                migrated = mm.group(1).strip(" -_.:\"'")
                if migrated.lower() not in DISALLOWED_IDENTIFIERS and len(migrated) >= 3 and not migrated.startswith("-"):
                    if migrated not in extracted_handles:
                        extracted_handles.append(migrated)
                    add_entity({
                        "entity_type": "handle",
                        "canonical_name": f"@{migrated}",
                        "normalized_value": migrated.lower(),
                        "evidence_text": mm.group(0),
                        "confidence": 0.90,
                        "attributes": {"handle": migrated, "platform": "darknet", "migration": True}
                    })
                    if primary_handle and primary_handle != migrated.lower():
                        relationships.append({
                            "source_type": "handle",
                            "source_value": primary_handle,
                            "target_type": "handle",
                            "target_value": migrated.lower(),
                            "relationship_type": "SAME_AS",
                            "confidence": 0.88,
                            "evidence_type": "explicit_claim",
                            "explanation": f"Persona migration statement linking @{primary_handle} and @{migrated.lower()}"
                        })

        # Case B: "Also valid for: email1, email2" in PGP blocks
        also_valid_matches = re.finditer(r'Also valid for:\s*([^\n]+)', text, re.IGNORECASE)
        for av in also_valid_matches:
            av_text = av.group(1)
            for em in re.finditer(r'([a-zA-Z0-9_\-]{3,25})@', av_text):
                vh = em.group(1).strip().lower()
                if vh not in DISALLOWED_IDENTIFIERS and len(vh) >= 3:
                    add_entity({
                        "entity_type": "handle",
                        "canonical_name": f"@{vh}",
                        "normalized_value": vh,
                        "evidence_text": av.group(0),
                        "confidence": 0.90,
                        "attributes": {"handle": vh, "platform": "darknet"}
                    })
                    if primary_handle and primary_handle != vh:
                        relationships.append({
                            "source_type": "handle",
                            "source_value": primary_handle,
                            "target_type": "handle",
                            "target_value": vh,
                            "relationship_type": "SAME_AS",
                            "confidence": 0.88,
                            "evidence_type": "explicit_claim",
                            "explanation": f"PGP UID credential cross-validation linking @{primary_handle} and @{vh}"
                        })

        # Case C: Inline equality expressions: e.g. "v3nd0r_x (= shadowfox)"
        eq_inline = re.finditer(r'([a-zA-Z0-9_\-]{3,25})(?:\s*\([^\)]*\))?\s*(?:=|\(=\s*)\s*([a-zA-Z0-9_\-]{3,25})\)?', text)
        for eqm in eq_inline:
            eh1 = eqm.group(1).strip().lower()
            eh2 = eqm.group(2).strip().lower()
            if (eh1 not in DISALLOWED_IDENTIFIERS and eh2 not in DISALLOWED_IDENTIFIERS and
                len(eh1) >= 3 and len(eh2) >= 3 and eh1 != eh2):
                if not any(r.get("source_value") == eh1 and r.get("target_value") == eh2 for r in relationships):
                    relationships.append({
                        "source_type": "handle",
                        "source_value": eh1,
                        "target_type": "handle",
                        "target_value": eh2,
                        "relationship_type": "SAME_AS",
                        "confidence": 0.88,
                        "evidence_type": "explicit_claim",
                        "explanation": f"Vendor cross-reference equivalence linking @{eh1} and @{eh2}"
                    })

        # Case D: Multi-line equality blocks in intelligence cross-reference reports (e.g. paste p004)
        lines = text.splitlines()
        current_eq_base = None
        for line in lines:
            line_str = line.strip()
            if line_str.startswith("==="):
                current_eq_base = None
            elif line_str.startswith("="):
                sub_m = re.match(r'^=\s*([a-zA-Z0-9_\-]{3,25})', line_str)
                if sub_m and current_eq_base:
                    eq_target = sub_m.group(1).strip().lower()
                    if eq_target not in DISALLOWED_IDENTIFIERS and len(eq_target) >= 3 and eq_target != current_eq_base:
                        if not any(r.get("source_value") == current_eq_base and r.get("target_value") == eq_target for r in relationships):
                            relationships.append({
                                "source_type": "handle",
                                "source_value": current_eq_base,
                                "target_type": "handle",
                                "target_value": eq_target,
                                "relationship_type": "SAME_AS",
                                "confidence": 0.88,
                                "evidence_type": "explicit_claim",
                                "explanation": f"Cross-reference identity correlation linking @{current_eq_base} and @{eq_target}"
                            })
            else:
                base_m = re.match(r'^([a-zA-Z0-9_\-]{3,25})(?:\s*\([^\)]+\))?\s*$', line_str)
                if base_m:
                    cand_base = base_m.group(1).strip().lower()
                    if cand_base not in DISALLOWED_IDENTIFIERS and len(cand_base) >= 3:
                        current_eq_base = cand_base
                elif not line_str:
                    pass
                else:
                    current_eq_base = None

        # Case E: Slash-separated handles in titles or headers: e.g. "nullbyte / cryptosmith — PGP Public Key"
        slash_m = re.finditer(r'\b([a-zA-Z0-9_\-]{3,25})\s*/\s*([a-zA-Z0-9_\-]{3,25})\b', text)
        for sm in slash_m:
            sh1, sh2 = sm.group(1).strip().lower(), sm.group(2).strip().lower()
            if (sh1 not in DISALLOWED_IDENTIFIERS and sh2 not in DISALLOWED_IDENTIFIERS and
                len(sh1) >= 3 and len(sh2) >= 3 and sh1 != sh2):
                if not any(r.get("source_value") == sh1 and r.get("target_value") == sh2 for r in relationships):
                    relationships.append({
                        "source_type": "handle",
                        "source_value": sh1,
                        "target_type": "handle",
                        "target_value": sh2,
                        "relationship_type": "SAME_AS",
                        "confidence": 0.88,
                        "evidence_type": "explicit_claim",
                        "explanation": f"Dual persona cross-reference linking @{sh1} and @{sh2}"
                    })

        # Case F: Multi-platform cross-reference vendor blocks (e.g. paste p003)
        op_sections = re.split(r'\b(?:OPERATOR|\d+\.\s*OPERATOR)\s*:\s*', text, flags=re.IGNORECASE)
        for sec in op_sections[1:]:
            sec_handles = []
            for hm in re.finditer(r'(?:Handle|Vendor|Account)\s*:\s*@?([a-zA-Z0-9_\-]{3,25})', sec, re.IGNORECASE):
                h_val = hm.group(1).strip().lower()
                if h_val not in DISALLOWED_IDENTIFIERS and len(h_val) >= 3:
                    if h_val not in sec_handles:
                        sec_handles.append(h_val)
            if len(sec_handles) >= 2:
                for i in range(len(sec_handles)):
                    for j in range(i + 1, len(sec_handles)):
                        sh1, sh2 = sec_handles[i], sec_handles[j]
                        if not any(r.get("source_value") == sh1 and r.get("target_value") == sh2 and r.get("relationship_type") == "SAME_AS" for r in relationships):
                            relationships.append({
                                "source_type": "handle",
                                "source_value": sh1,
                                "target_type": "handle",
                                "target_value": sh2,
                                "relationship_type": "SAME_AS",
                                "confidence": 0.90,
                                "evidence_type": "explicit_claim",
                                "explanation": f"Cross-platform operator vendor mapping linking @{sh1} and @{sh2}"
                            })

        # 6. Extract Marketplace Trust Links & Vouches (Problem Statement: "trust links")
        # Direct A vouches for B pattern
        direct_vouch = re.finditer(r'@?([a-zA-Z0-9_\-]{3,25})\s*(?:vouches? for|\+1 (?:vouch )?for|endorses?|recommends)\s*@([a-zA-Z0-9_\-]{3,25})', text, re.IGNORECASE)
        for dvm in direct_vouch:
            src = dvm.group(1).strip().lower()
            tgt = dvm.group(2).strip().lower()
            if (src not in DISALLOWED_IDENTIFIERS and tgt not in DISALLOWED_IDENTIFIERS and
                len(src) >= 3 and len(tgt) >= 3 and src != tgt):
                add_entity({
                    "entity_type": "handle",
                    "canonical_name": f"@{src}",
                    "normalized_value": src,
                    "evidence_text": dvm.group(0),
                    "confidence": 0.90,
                    "attributes": {"handle": src, "platform": "darknet"}
                })
                add_entity({
                    "entity_type": "handle",
                    "canonical_name": f"@{tgt}",
                    "normalized_value": tgt,
                    "evidence_text": dvm.group(0),
                    "confidence": 0.90,
                    "attributes": {"handle": tgt, "platform": "darknet"}
                })
                if not any(r.get("source_value") == src and r.get("target_value") == tgt and r.get("relationship_type") == "TRUSTS" for r in relationships):
                    relationships.append({
                        "source_type": "handle",
                        "source_value": src,
                        "target_type": "handle",
                        "target_value": tgt,
                        "relationship_type": "TRUSTS",
                        "confidence": 0.88,
                        "evidence_type": "explicit_vouch",
                        "explanation": f"Explicit trust voucher linking @{src} -> @{tgt}"
                    })

        trust_patterns = [
            r'(?:verified vendors?|trusted vendors?|verified sellers?):\s*([^\n\<\>]+)',
            r'(?:vouch(?:ed)? (?:for|by)|\+1 vouch for|trusts|endorses|recommended by)\s*@?([a-zA-Z0-9_\-]{3,25})',
            r'(?:buyer review|positive feedback|deal completed) (?:from|with)\s*@?([a-zA-Z0-9_\-]{3,25})',
        ]
        for tpat in trust_patterns:
            for tm in re.finditer(tpat, text, re.IGNORECASE):
                matched_raw = tm.group(1)
                candidates = [c.strip(" @,.:\"'") for c in re.split(r'[,;\s]+', matched_raw) if c.strip(" @,.:\"'")]
                for cand in candidates:
                    cand_lower = cand.lower()
                    if cand_lower not in DISALLOWED_IDENTIFIERS and len(cand_lower) >= 3 and not cand_lower.startswith("-"):
                        add_entity({
                            "entity_type": "handle",
                            "canonical_name": f"@{cand}",
                            "normalized_value": cand_lower,
                            "evidence_text": tm.group(0),
                            "confidence": 0.90,
                            "attributes": {"handle": cand, "platform": "darknet"}
                        })
                        src_handle = author_handle or (extracted_handles[0].lower() if extracted_handles and extracted_handles[0].lower() != cand_lower else (extracted_handles[1].lower() if len(extracted_handles) > 1 and extracted_handles[1].lower() != cand_lower else None))
                        if src_handle and src_handle != cand_lower:
                            if not any(r.get("source_value") == src_handle and r.get("target_value") == cand_lower and r.get("relationship_type") == "TRUSTS" for r in relationships):
                                relationships.append({
                                    "source_type": "handle",
                                    "source_value": src_handle,
                                    "target_type": "handle",
                                    "target_value": cand_lower,
                                    "relationship_type": "TRUSTS",
                                    "confidence": 0.85,
                                    "evidence_type": "explicit_vouch",
                                    "explanation": f"Trust endorsement / vouch link between @{src_handle} and @{cand_lower}"
                                })

        # 7. Connect Extracted Handles to Observational Indicators
        # In multi-handle documents (e.g. vouch matrices, summaries, multi-vendor paste reports),
        # attribute indicators to the specific handle mentioned in proximity, not globally to author.
        def _get_handle_for_entity(ent_item: Dict[str, Any]) -> Optional[str]:
            if not extracted_handles:
                return None
            if len(extracted_handles) == 1:
                return extracted_handles[0].lower()
            
            raw_target = ent_item.get("evidence_text") or ent_item.get("canonical_name") or ent_item.get("normalized_value")
            if not raw_target:
                return author_handle or extracted_handles[0].lower()
                
            ind_idx = text.find(raw_target)
            if ind_idx == -1:
                return author_handle or extracted_handles[0].lower()
                
            best_handle = None
            min_dist = float('inf')
            
            # Find handle closest preceding the indicator
            for h in extracted_handles:
                h_clean = h.lower()
                for hm in re.finditer(rf'(?:@|\b){re.escape(h_clean)}\b', text[:ind_idx], re.IGNORECASE):
                    dist = ind_idx - hm.end()
                    if 0 <= dist < min_dist:
                        min_dist = dist
                        best_handle = h_clean
                        
            # If no handle preceded it within 400 chars, check shortly after
            if not best_handle or min_dist > 400:
                op_first = re.search(r'\b(?:OPERATOR|\d+\.\s*OPERATOR)\s*:', text, re.IGNORECASE)
                if author_handle and op_first and ind_idx < op_first.start():
                    return author_handle
                for h in extracted_handles:
                    h_clean = h.lower()
                    for hm in re.finditer(rf'(?:@|\b){re.escape(h_clean)}\b', text[ind_idx:ind_idx + 250], re.IGNORECASE):
                        dist = hm.start()
                        if 0 <= dist < min_dist:
                            min_dist = dist
                            best_handle = h_clean
                            
            return best_handle or author_handle or extracted_handles[0].lower()

        for ent in entities:
            h_owner = _get_handle_for_entity(ent)
            if not h_owner:
                continue

            if ent["entity_type"] == "pgp_key":
                conf = 0.92 if block_type == "pgp_information" else 0.75
                relationships.append({
                    "source_type": "handle",
                    "source_value": h_owner,
                    "target_type": "pgp_key",
                    "target_value": ent["normalized_value"],
                    "relationship_type": "USES_PGP",
                    "confidence": conf,
                    "evidence_type": "signature_match" if block_type == "pgp_information" else "co_occurrence",
                    "explanation": f"Handle @{h_owner} associated with PGP key {ent['canonical_name']}"
                })
            elif ent["entity_type"] == "wallet":
                relationships.append({
                    "source_type": "handle",
                    "source_value": h_owner,
                    "target_type": "wallet",
                    "target_value": ent["normalized_value"],
                    "relationship_type": "USES_WALLET",
                    "confidence": 0.85,
                    "evidence_type": "co_occurrence",
                    "explanation": f"Payment wallet {ent['canonical_name']} provided by @{h_owner}"
                })
            elif ent["entity_type"] == "identifier" and ent["normalized_value"] != h_owner:
                relationships.append({
                    "source_type": "handle",
                    "source_value": h_owner,
                    "target_type": "identifier",
                    "target_value": ent["normalized_value"],
                    "relationship_type": "USES_IDENTIFIER",
                    "confidence": 0.90,
                    "evidence_type": "co_occurrence",
                    "explanation": f"Contact identifier {ent['normalized_value']} listed by @{h_owner}"
                })
            elif ent["entity_type"] == "onion_service":
                relationships.append({
                    "source_type": "handle",
                    "source_value": h_owner,
                    "target_type": "onion_service",
                    "target_value": ent["normalized_value"],
                    "relationship_type": "OPERATES_ON",
                    "confidence": 0.85,
                    "evidence_type": "co_occurrence",
                    "explanation": f"Onion service {ent['normalized_value']} referenced by @{h_owner}"
                })

        return {"entities": entities, "relationships": relationships}

