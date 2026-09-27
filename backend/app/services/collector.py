"""
Tor-aware HTTP Collector — Connects through Tor SOCKS proxy.
Implements bounded crawling with depth/page/runtime limits.
Content and links are separated per spec requirements.

Two-path fetcher strategy:
  - Synthetic local onion services → direct aiohttp (fast, no proxy overhead)
  - Real .onion / external targets  → Playwright (JS-rendering, Tor SOCKS5 proxy)
                                    → aiohttp Tor fallback if Playwright fails
"""
import hashlib
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from urllib.parse import urljoin, urlparse
import aiohttp
from aiohttp_socks import ProxyConnector
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_
from app.config import get_settings
from app.models import Source, CrawlJob, Document
from app.models import SemanticBlock
from app.services.storage import StorageService
from app.services.html_parser import SemanticHTMLParser

logger = logging.getLogger(__name__)
settings = get_settings()
storage_service = StorageService()
html_parser = SemanticHTMLParser()

# Known synthetic onion addresses (direct Docker container routing)
SYNTHETIC_ONION_MAP = {
    "v35qmtegx52v6tv4enpdlvln5i7vggliesmplmlr2xxcwo5iqyc3pyyd.onion": "forum:5000",
    "f7xtwqatlowep4qs7rn5chrhrdpjcreie7nzjvcgxntqsttskrj3z5yd.onion": "market:5000",
    "jlvccjr6pzvcfk4uaqknfjqyktukegbj4bz3p7bupyy7gr3bwvcge6yd.onion": "paste:5000",
}


class CrawlStatus:
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    value = None

    def __init__(self, val: str):
        self.value = val

    @classmethod
    def __getattr__(cls, name):
        return name.lower()


# ─────────────────────────────────────────────────────────────────────────────
# Playwright JS-Rendering Fetcher
# ─────────────────────────────────────────────────────────────────────────────

class PlaywrightFetcher:
    """
    Headless Chromium fetcher via Playwright.
    Routes through Tor SOCKS5 proxy for .onion addresses.
    Waits for JS to fully render before capturing the DOM.
    Falls back gracefully to None on any failure — caller will use aiohttp.
    """

    def __init__(self):
        self._available = False
        self._check_availability()

    def _check_availability(self):
        """Check if playwright is installed and importable."""
        try:
            import playwright  # noqa
            self._available = True
            logger.info("[PLAYWRIGHT] Playwright library available — JS-rendering enabled.")
        except ImportError:
            self._available = False
            logger.warning("[PLAYWRIGHT] Playwright not installed — JS-rendering disabled. Falling back to aiohttp.")

    @property
    def available(self) -> bool:
        return self._available and settings.playwright_enabled

    async def fetch(self, url: str, proxy_url: Optional[str] = None) -> Optional[str]:
        """
        Fetch a URL using Playwright Chromium with optional SOCKS5 proxy.
        Returns fully JS-rendered HTML string, or None on failure.
        """
        if not self.available:
            return None

        try:
            from playwright.async_api import async_playwright

            proxy_config = None
            if proxy_url:
                # Playwright uses {"server": "..."} format for proxy
                proxy_config = {"server": proxy_url}

            async with async_playwright() as pw:
                browser = await pw.chromium.launch(
                    headless=True,
                    proxy=proxy_config,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",  # use /tmp instead of /dev/shm
                        "--disable-gpu",
                        "--no-first-run",
                        "--no-zygote",
                        "--single-process",       # safer in Docker
                        "--disable-extensions",
                    ]
                )

                context = await browser.new_context(
                    ignore_https_errors=True,   # many .onion sites have self-signed certs
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; rv:109.0) "
                        "Gecko/20100101 Firefox/115.0"  # common Tor Browser UA
                    ),
                    java_script_enabled=True,
                    bypass_csp=True,            # bypass Content-Security-Policy restrictions
                )

                page = await context.new_page()

                # Block unnecessary resources to speed up loading
                await page.route(
                    "**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,otf,eot,mp4,mp3,pdf}",
                    lambda route: route.abort()
                )

                try:
                    await page.goto(
                        url,
                        wait_until=settings.playwright_wait_until,
                        timeout=settings.playwright_timeout_ms
                    )

                    # Give extra time for any deferred JS (lazy-loaded forum threads etc.)
                    await page.wait_for_timeout(1500)

                    html = await page.content()
                    logger.info(f"[PLAYWRIGHT] Successfully rendered {url} ({len(html)} chars)")
                    return html

                except Exception as nav_err:
                    logger.warning(f"[PLAYWRIGHT] Navigation failed for {url}: {nav_err}")
                    return None

                finally:
                    await browser.close()

        except Exception as e:
            logger.warning(f"[PLAYWRIGHT] Fetch error for {url}: {e}")
            return None


# Module-level singleton so the availability check only runs once
_playwright_fetcher = PlaywrightFetcher()


# ─────────────────────────────────────────────────────────────────────────────
# Main Collector
# ─────────────────────────────────────────────────────────────────────────────

class TorCollector:
    """Tor-aware collector with bounded crawling and Playwright JS-rendering"""

    def __init__(self):
        self.max_depth = settings.max_crawl_depth
        self.max_pages = settings.max_pages_per_source
        self.max_runtime = settings.max_crawl_runtime_seconds
        self.visited_urls = set()
        self.pages_collected = 0

    async def crawl_source(self, source: Source, db: AsyncSession, job: Optional[CrawlJob] = None) -> Dict:
        """Start a bounded crawl of a source"""
        target_url = source.url or getattr(source, "onion_address", "") or ""
        if job is None:
            job = CrawlJob(
                source_id=source.source_id,
                url=target_url,
                status="running",
                started_at=datetime.utcnow(),
                depth=0
            )
            db.add(job)
        else:
            job.status = "running"
            job.started_at = datetime.utcnow()
        await db.commit()

        self.visited_urls = set()
        self.pages_collected = 0
        start_time = datetime.utcnow()

        # Normalize starting URL
        start_url = target_url.strip()
        if not start_url.startswith("http://") and not start_url.startswith("https://"):
            start_url = f"http://{start_url}"

        queue: List[Tuple[str, int]] = [(start_url, 0)]
        results = {"pages": 0, "errors": 0, "links_found": 0}

        # Resolve proxy URL (convert socks5h:// to socks5:// for aiohttp_socks)
        proxy_url = settings.tor_socks_proxy
        if proxy_url.startswith("socks5h://"):
            proxy_url = "socks5://" + proxy_url[len("socks5h://"):]

        timeout = aiohttp.ClientTimeout(total=20)

        try:
            # Two aiohttp sessions: Tor SOCKS for real onions, direct for local Docker services
            tor_connector = None
            try:
                tor_connector = ProxyConnector.from_url(proxy_url, rdns=True)
            except Exception as ce:
                logger.warning(f"Could not create Tor connector: {ce}")

            tor_session = aiohttp.ClientSession(connector=tor_connector, timeout=timeout) if tor_connector else None
            direct_session = aiohttp.ClientSession(timeout=timeout)

            try:
                while queue and self.pages_collected < self.max_pages:
                    # Check runtime limit
                    elapsed = (datetime.utcnow() - start_time).total_seconds()
                    if elapsed > self.max_runtime:
                        logger.info(f"Runtime limit reached for source {source.source_id}")
                        break

                    raw_url, depth = queue.pop(0)
                    url = self._normalize_crawl_url(raw_url)

                    if depth > self.max_depth:
                        continue
                    if url in self.visited_urls:
                        continue

                    self.visited_urls.add(url)

                    try:
                        page_data = await self._fetch_page(
                            url, tor_session, direct_session, proxy_url
                        )

                        if page_data:
                            page = await self._store_document(
                                db, source, job, url, page_data, depth
                            )
                            if page:
                                self.pages_collected += 1
                                results["pages"] += 1
                                job.pages_collected = self.pages_collected
                                await db.flush()

                                # Extract links (separate from content per spec)
                                if depth < self.max_depth:
                                    links = self._extract_links(page_data["html"], url)
                                    results["links_found"] += len(links)
                                    for link_url, link_text, link_context in links:
                                        if link_url not in self.visited_urls:
                                            queue.append((link_url, depth + 1))

                                    page.metadata_ = {
                                        "links_extracted": [
                                            {"url": l[0], "text": l[1], "context": l[2]}
                                            for l in links[:100]
                                        ]
                                    }
                                    await db.flush()

                            # Discover and record new onion sources (Spec Section 5.C)
                            new_onions = await discover_onion_urls(page_data["html"], url)
                            for onion in new_onions:
                                try:
                                    onion_domain = onion["domain"].lower().strip()
                                    src_chk = await db.execute(
                                        select(Source).where(
                                            or_(
                                                Source.domain == onion_domain,
                                                Source.url.ilike(f"%{onion_domain}%")
                                            )
                                        )
                                    )
                                    if not src_chk.scalar_one_or_none():
                                        new_source = Source(
                                            name=onion_domain,
                                            url=onion["url"],
                                            domain=onion_domain,
                                            source_type="marketplace" if "vault" in onion_domain or "market" in onion_domain else "other",
                                            reliability_score=0.85,
                                            first_seen_at=datetime.utcnow(),
                                            last_seen_at=datetime.utcnow(),
                                            metadata_={
                                                "status": "discovered",
                                                "discovered_from": target_url,
                                                "relevance_score": 0.8,
                                                "discovery_timestamp": datetime.utcnow().isoformat()
                                            }
                                        )
                                        db.add(new_source)
                                        await db.flush()
                                        logger.info(f"Recorded newly discovered onion source: {onion['url']}")
                                except Exception as disc_err:
                                    logger.warning(f"Error recording discovered source {onion['url']}: {disc_err}")

                    except Exception as e:
                        logger.error(f"Error fetching {url}: {e}")
                        results["errors"] += 1

            finally:
                if tor_session:
                    await tor_session.close()
                await direct_session.close()

            job.status = "completed"
            job.finished_at = datetime.utcnow()
            job.pages_collected = self.pages_collected

        except Exception as e:
            logger.error(f"Crawl failed for source {source.source_id}: {e}")
            job.status = "failed"
            job.error = str(e)[:500]
            job.finished_at = datetime.utcnow()

        # Update source
        source.last_seen_at = datetime.utcnow()
        if not source.metadata_:
            source.metadata_ = {}
        source.metadata_["last_crawl_result"] = job.status
        source.metadata_["pages_collected"] = source.metadata_.get("pages_collected", 0) + self.pages_collected
        await db.flush()

        return results

    def _normalize_crawl_url(self, url: str) -> str:
        """Map localhost:5000/5001/5002 to internal docker hostnames when running in container"""
        u = url.strip()
        if not u.startswith("http://") and not u.startswith("https://"):
            u = f"http://{u}"
        u = u.replace("localhost:5000", "forum:5000").replace("127.0.0.1:5000", "forum:5000")
        u = u.replace("localhost:5001", "market:5000").replace("127.0.0.1:5001", "market:5000").replace("market:5001", "market:5000")
        u = u.replace("localhost:5002", "paste:5000").replace("127.0.0.1:5002", "paste:5000").replace("paste:5002", "paste:5000")
        return u

    def _get_synthetic_direct_url(self, url: str) -> Optional[str]:
        """
        Returns a direct Docker container URL if the given URL maps to a known
        synthetic local onion service, otherwise None.
        """
        parsed = urlparse(url)
        hostname = parsed.netloc.split(":")[0]  # strip port if any
        if hostname in SYNTHETIC_ONION_MAP:
            container = SYNTHETIC_ONION_MAP[hostname]
            return url.replace(parsed.netloc, container)
        return None

    def _is_synthetic(self, url: str) -> bool:
        """Returns True if URL points to one of the known local synthetic onion services."""
        return self._get_synthetic_direct_url(url) is not None

    async def _fetch_page(
        self,
        url: str,
        tor_session: Optional[aiohttp.ClientSession],
        direct_session: aiohttp.ClientSession,
        proxy_url: str,
    ) -> Optional[Dict]:
        """
        Smart two-path fetcher:
          1. Synthetic local onion → direct aiohttp (fast, no proxy)
          2. Real .onion / external → Playwright (JS-rendered, Tor SOCKS5 proxy)
                                    → aiohttp Tor fallback if Playwright fails
        """
        # ── Path 1: Synthetic local services ───────────────────────────────
        direct_url = self._get_synthetic_direct_url(url)
        if direct_url:
            return await self._aiohttp_fetch(direct_session, direct_url)

        # ── Path 2: Real targets — try Playwright first ─────────────────────
        if _playwright_fetcher.available:
            logger.info(f"[PLAYWRIGHT] Attempting JS-rendered fetch: {url}")
            html = await _playwright_fetcher.fetch(url, proxy_url=proxy_url)
            if html:
                return {
                    "html": html,
                    "status": 200,
                    "content_type": "text/html",
                    "url": url,
                    "fetcher": "playwright",
                }
            logger.warning(f"[PLAYWRIGHT] Failed — falling back to aiohttp for {url}")

        # ── Path 3: aiohttp Tor fallback ────────────────────────────────────
        session = tor_session if (".onion" in url and tor_session) else direct_session
        result = await self._aiohttp_fetch(session, url)
        if result:
            result["fetcher"] = "aiohttp"
        return result

    async def _aiohttp_fetch(self, session: aiohttp.ClientSession, url: str) -> Optional[Dict]:
        """Fetch a page via aiohttp (existing implementation, unchanged)."""
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    logger.warning(f"HTTP {response.status} for {url}")
                    return None

                html = await response.text(errors='replace')
                content_type = response.headers.get('Content-Type', '')

                if 'text/html' not in content_type and 'text/plain' not in content_type:
                    return None

                return {
                    "html": html,
                    "status": response.status,
                    "content_type": content_type,
                    "url": str(response.url),
                    "fetcher": "aiohttp",
                }
        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching {url}")
            return None
        except Exception as e:
            logger.error(f"Fetch error for {url}: {e}")
            return None

    async def _store_document(
        self, db: AsyncSession, source: Source, job: CrawlJob,
        url: str, page_data: Dict, depth: int
    ) -> Optional[Document]:
        """Store collected page immutably, compute SHA-256 hash, and parse semantic blocks"""
        raw_html = page_data["html"]
        content_hash, storage_uri = storage_service.store_raw_html(raw_html, url)

        # Check for duplicates
        existing_doc = await db.execute(
            select(Document).where(
                and_(
                    Document.source_id == source.source_id,
                    Document.url == url,
                    Document.content_hash == content_hash
                )
            ).limit(1)
        )
        if existing_doc.scalar_one_or_none():
            logger.info(f"Skipping duplicate content for {url}")
            return None

        # Parse DOM & extract semantic blocks
        full_text, parsed_blocks = html_parser.parse(raw_html)

        soup = BeautifulSoup(raw_html, "html.parser")
        title = soup.title.string.strip() if soup.title and soup.title.string else None

        doc = Document(
            source_id=source.source_id,
            url=url,
            retrieved_at=datetime.utcnow(),
            http_status=page_data.get("status", 200),
            content_type=page_data.get("content_type", "text/html"),
            content_hash=content_hash,
            storage_uri=storage_uri,
            parser_version=html_parser.parser_version,
            title=title,
            normalized_content=full_text,
            is_processed="false"
        )
        db.add(doc)
        await db.flush()

        # Persist semantic blocks
        for pb in parsed_blocks:
            sb = SemanticBlock(
                document_id=doc.document_id,
                block_type=pb.block_type,
                text_content=pb.text_content,
                xpath=pb.xpath,
                css_selector=pb.css_selector,
                dom_start=pb.dom_start,
                dom_end=pb.dom_end,
                char_start=pb.char_start,
                char_end=pb.char_end,
                block_hash=pb.block_hash,
                sequence_number=pb.sequence_number,
                created_at=pb.published_at or datetime.utcnow()
            )
            db.add(sb)
        await db.flush()

        return doc

    def _extract_links(self, html: str, base_url: str) -> List[Tuple[str, str, str]]:
        """
        Extract links SEPARATELY from content (spec requirement).
        Returns list of (url, anchor_text, surrounding_context)
        """
        soup = BeautifulSoup(html, "html.parser")
        links = []
        seen = set()

        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if not href or href.startswith("#") or href.startswith("javascript:"):
                continue

            # Resolve relative URLs
            full_url = urljoin(base_url, href)
            parsed = urlparse(full_url)

            # Only follow onion URLs or same-domain
            if ".onion" not in parsed.netloc and parsed.netloc not in urlparse(base_url).netloc:
                continue

            if full_url in seen:
                continue
            seen.add(full_url)

            anchor_text = a_tag.get_text(strip=True)
            # Get surrounding context (parent element text)
            parent = a_tag.parent
            context = parent.get_text(strip=True)[:200] if parent else ""

            links.append((full_url, anchor_text, context))

        return links


async def discover_onion_urls(html: str, source_url: str) -> List[Dict]:
    """Extract newly discovered onion URLs from page content"""
    import re
    onion_pattern = re.compile(r'https?://([a-z2-7]{16,56}\.onion)[^\s"\'<>]*', re.IGNORECASE)
    plain_pattern = re.compile(r'\b([a-z2-7]{16,56}\.onion)\b', re.IGNORECASE)

    discovered = []
    seen = set()
    src_netloc = urlparse(source_url).netloc.lower().strip()

    for match in onion_pattern.finditer(html):
        domain = match.group(1).lower().strip()
        if domain not in seen and domain != src_netloc:
            seen.add(domain)
            discovered.append({
                "url": f"http://{domain}",
                "domain": domain,
                "discovered_from": source_url
            })

    for match in plain_pattern.finditer(html):
        domain = match.group(1).lower().strip()
        if domain not in seen and domain != src_netloc:
            seen.add(domain)
            discovered.append({
                "url": f"http://{domain}",
                "domain": domain,
                "discovered_from": source_url
            })

    return discovered
