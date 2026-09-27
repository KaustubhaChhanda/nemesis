import asyncio
import logging
import aiohttp
from typing import Dict, Any, List, Optional
from datetime import datetime
import re

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class ActiveInfraScanner:
    """
    Actively probes Tor hidden services for operational security failures
    and misconfigurations.
    """
    def __init__(self):
        self.proxy = settings.tor_socks_proxy
        self.timeout = aiohttp.ClientTimeout(total=20)

    async def scan_onion(self, onion_domain: str) -> List[Dict[str, Any]]:
        """
        Runs all active scans against an onion domain and returns discovered indicators.
        Returns a list of evidence dicts.
        """
        if not onion_domain.endswith('.onion'):
            return []

        indicators = []
        base_url = f"http://{onion_domain}"

        # 1. Check Server Headers for default banners
        headers_info = await self._check_http_headers(base_url)
        if headers_info:
            indicators.append(headers_info)

        # 2. Check for exposed server-status
        status_info = await self._check_server_status(base_url)
        if status_info:
            indicators.extend(status_info)

        # 3. Dummy check for SSL Certificate misconfigs (in real scenarios, requires SOCKS5 + SSL handshake parser)
        # We simulate the logic for seamless live target addition.
        cert_info = await self._check_ssl_cert(onion_domain)
        if cert_info:
            indicators.append(cert_info)

        return indicators

    async def _check_http_headers(self, base_url: str) -> Optional[Dict[str, Any]]:
        """Checks for verbose server banners in HTTP headers."""
        try:
            from aiohttp_socks import ProxyConnector
            connector = ProxyConnector.from_url(self.proxy) if self.proxy else None
            async with aiohttp.ClientSession(connector=connector, timeout=self.timeout) as session:
                async with session.head(base_url) as response:
                    server_header = response.headers.get("Server", "")
                    if server_header and ("Apache" in server_header or "nginx" in server_header):
                        return {
                            "type": "server_banner",
                            "value": server_header,
                            "description": f"Exposed Server Banner: {server_header}"
                        }
        except Exception as e:
            logger.debug(f"Header scan failed for {base_url}: {e}")
        return None

    async def _check_server_status(self, base_url: str) -> List[Dict[str, Any]]:
        """Probes for Apache mod_status page which might leak internal IPs/Clearnet domains."""
        indicators = []
        try:
            from aiohttp_socks import ProxyConnector
            connector = ProxyConnector.from_url(self.proxy) if self.proxy else None
            async with aiohttp.ClientSession(connector=connector, timeout=self.timeout) as session:
                async with session.get(f"{base_url}/server-status") as response:
                    if response.status == 200:
                        text = await response.text()
                        if "Apache Status" in text or "Server Version" in text:
                            indicators.append({
                                "type": "misconfiguration",
                                "value": "/server-status",
                                "description": "Exposed Apache server-status page found."
                            })
                            # Naive regex for IP addresses in the status page
                            ips = re.findall(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', text)
                            for ip in set(ips):
                                # Filter out common internal IPs
                                if not ip.startswith(("127.", "10.", "192.168.")):
                                    indicators.append({
                                        "type": "clearnet_ip",
                                        "value": ip,
                                        "description": f"Leaked Clearnet IP found in server-status: {ip}"
                                    })
        except Exception as e:
            logger.debug(f"Server-status scan failed for {base_url}: {e}")
        return indicators

    async def _check_ssl_cert(self, onion_domain: str) -> Optional[Dict[str, Any]]:
        """
        Placeholder for checking SSL certificates over Tor.
        In a live environment, this connects via SOCKS5 and does an SSL handshake to read the SAN.
        """
        # We can implement a try-catch for https://<onion_domain>
        try:
            from aiohttp_socks import ProxyConnector
            import ssl
            connector = ProxyConnector.from_url(self.proxy) if self.proxy else None
            # Disable SSL verification just to grab the cert data
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            async with aiohttp.ClientSession(connector=connector, timeout=self.timeout) as session:
                # Some onion services misconfigure HTTPS. We try to connect.
                async with session.get(f"https://{onion_domain}", ssl=ssl_context) as response:
                    # If we somehow get a response, the cert might be valid.
                    # Getting the raw cert in aiohttp is complex, so we just log success.
                    # For real implementation, we'd use OpenSSL or `ssl.get_peercert()` via a raw socket.
                    pass
        except Exception:
            pass
        return None
