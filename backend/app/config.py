"""Nemesis Backend Configuration"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://nemesis:nemesis_secret_2026@localhost:5432/nemesis"
    database_url_sync: str = "postgresql://nemesis:nemesis_secret_2026@localhost:5432/nemesis"

    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "nemesis_graph_2026"

    # Redis
    redis_url: str = "redis://localhost:16379/0"

    # Tor
    tor_socks_proxy: str = "socks5://tor:9050"

    # Groq LLM
    groq_api_key: str = ""
    groq_model: str = "qwen/qwen3.8-27b"

    # OSINT & Shodan
    shodan_api_key: str = ""

    # JWT
    jwt_secret: str = "nemesis_jwt_secret_change_in_production_2026"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 480

    # Admin
    admin_username: str = "investigator"
    admin_password: str = "nemesis_admin_2026"

    # Collector
    max_crawl_depth: int = 3
    max_pages_per_source: int = 50
    max_crawl_runtime_seconds: int = 300
    crawl_interval_minutes: int = 30

    # Playwright JS-rendering scraper
    playwright_enabled: bool = True
    playwright_timeout_ms: int = 30000
    playwright_wait_until: str = "networkidle"

    # App
    app_name: str = "Nemesis"
    app_version: str = "0.1.0"
    debug: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
