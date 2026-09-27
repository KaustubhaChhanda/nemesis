"""
Immutable Evidence Storage Service.
Stores raw HTML with cryptographic SHA-256 hashing.
Raw HTML is immutable evidence stored in S3/MinIO or local filesystem object store.
"""
import os
import hashlib
import logging
from pathlib import Path
from typing import Tuple, Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

STORAGE_DIR = os.getenv("EVIDENCE_STORAGE_DIR", "/app/storage/raw_html")
if not os.path.exists("/app") and not os.path.isabs(STORAGE_DIR):
    STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../storage/raw_html"))


class StorageService:
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or STORAGE_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def store_raw_html(self, content: bytes | str, url: str = "") -> Tuple[str, str]:
        """
        Store raw HTML immutably.
        Returns:
            Tuple[content_hash (CHAR 64), storage_uri (TEXT)]
        """
        if isinstance(content, str):
            content_bytes = content.encode("utf-8")
        else:
            content_bytes = content

        content_hash = hashlib.sha256(content_bytes).hexdigest()
        file_path = self.base_dir / f"{content_hash}.html"

        # Immutable: only write if not already present
        if not file_path.exists():
            file_path.write_bytes(content_bytes)
            logger.info(f"Stored raw HTML evidence: {content_hash} ({len(content_bytes)} bytes)")
        else:
            logger.debug(f"Evidence file already exists: {content_hash}")

        storage_uri = f"file://{file_path.as_posix()}"
        return content_hash, storage_uri

    def get_raw_html(self, storage_uri: str) -> Optional[bytes]:
        """Retrieve immutable raw HTML content from storage URI"""
        try:
            if storage_uri.startswith("file://"):
                path_str = storage_uri[len("file://"):]
                if os.name == "nt" and path_str.startswith("/") and len(path_str) > 2 and path_str[2] == ":":
                    path_str = path_str[1:]
                path = Path(path_str)
                if path.exists():
                    return path.read_bytes()
                fallback_path = self.base_dir / path.name
                if fallback_path.exists():
                    return fallback_path.read_bytes()
            return None
        except Exception as e:
            logger.error(f"Failed to read storage URI {storage_uri}: {e}")
            return None

    def verify_raw_html(self, storage_uri: str, expected_hash: str) -> bool:
        """Cryptographically verify that stored HTML matches expected SHA-256 hash"""
        content = self.get_raw_html(storage_uri)
        if content is None:
            return False
        actual_hash = hashlib.sha256(content).hexdigest()
        return actual_hash.lower() == expected_hash.lower()
