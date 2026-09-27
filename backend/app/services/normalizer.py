"""
Identifier Normalizer — Canonical form computation.
Handles email, username, PGP, cryptocurrency, domain, onion URL normalization.
"""
import re


class IdentifierNormalizer:
    """Normalize identifiers into canonical forms for matching"""

    def normalize(self, id_type: str, value: str) -> str:
        normalizers = {
            "email": self._normalize_email,
            "username": self._normalize_username,
            "username_handle": self._normalize_username,
            "pgp_key": self._normalize_pgp,
            "pgp_fingerprint": self._normalize_pgp,
            "pgp_block": lambda v: v.strip(),
            "btc_address": self._normalize_btc,
            "xmr_address": self._normalize_xmr,
            "domain": self._normalize_domain,
            "onion_url": self._normalize_onion,
            "ip_address": self._normalize_ip,
            "ipv4": self._normalize_ip,
            "identifier": lambda v: v.strip().lower(),
            "port": lambda v: v.strip().lstrip(":"),
        }
        normalizer = normalizers.get(id_type, lambda v: v.strip())
        try:
            return normalizer(value)
        except Exception:
            return value.strip()

    def _normalize_email(self, email: str) -> str:
        email = email.strip().lower()
        parts = email.split("@")
        if len(parts) == 2:
            local, domain = parts
            return f"{local}@{domain}"
        return email

    def _normalize_username(self, username: str) -> str:
        username = username.strip().lstrip("@")
        return username.lower()

    def _normalize_pgp(self, fingerprint: str) -> str:
        # Remove spaces and normalize to uppercase
        return re.sub(r'\s+', '', fingerprint).upper()

    def _normalize_btc(self, address: str) -> str:
        return address.strip()

    def _normalize_xmr(self, address: str) -> str:
        return address.strip()

    def _normalize_domain(self, domain: str) -> str:
        domain = domain.strip().lower()
        # Strip protocol
        domain = re.sub(r'^https?://', '', domain)
        # Strip trailing slash/path
        domain = domain.split('/')[0]
        return domain

    def _normalize_onion(self, url: str) -> str:
        url = url.strip().lower()
        url = re.sub(r'^https?://', '', url)
        url = url.split('/')[0]
        return url

    def _normalize_ip(self, ip: str) -> str:
        return ip.strip()
