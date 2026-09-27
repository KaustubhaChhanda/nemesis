"""
Synthetic Darknet Marketplace — "NightMarket"
Realistic darknet marketplace inspired by Archetyp and Bohemia.
Features vendor trust tiers, multi-sig escrow, product listings, buyer reviews,
authentic publication timestamps, and genuine origin server telemetry leakage (/server-status).
"""
from flask import Flask, render_template_string, Response
import werkzeug.serving
from datetime import datetime

werkzeug.serving.WSGIRequestHandler.server_version = "Apache/2.4.52 (Ubuntu)"
werkzeug.serving.WSGIRequestHandler.sys_version = ""

app = Flask(__name__)

MARKET_DATA = {
    "site_name": "NightMarket",
    "stats": {
        "active_listings": 84,
        "verified_vendors": 19,
        "disputes_resolved": 312,
        "escrow_locked_btc": "14.821 BTC",
        "market_mirror": "f7xtwqatlowep4qs7rn5chrhrdpjcreie7nzjvcgxntqsttskrj3z5yd.onion"
    },
    "vendors": {
        "shadow_vendor": {
            "vendor_name": "shadow_vendor",
            "tier": "Level 5 — Elite Vendor",
            "rating": 4.92,
            "sales_count": 1247,
            "joined": "2025-12-01",
            "pgp": "7A3F 9B2E 1C4D 5E6F 8A9B 0C1D 2E3F 4A5B 6C7D 8E9F",
            "btc": "bc1q9h5yjqk3chz8gxlnqr5t7gwj5m4e2k9xcd4vf",
            "xmr": "888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsLTBhPpH5t6SenQA6nfEQRzs9c8qAA2xKSnVW7K29ymzP1cqdHq8",
            "contact": "shadow_vendor@secmail.pro",
            "telegram": "@shadowfox_sec",
            "bio": """Active darknet supplier since late 2025. Formerly operating as shadowfox on DarkGate Underground.
Specialized in zero-day exploit frameworks, hyper-hardened operational security operating systems, and encrypted communications infrastructure.
All transactions protected under NightMarket 2-of-3 multi-sig escrow. PGP signing key matches DarkGate advisory bulletins.""",
            "listings": [
                {
                    "id": 101,
                    "title": "CVE-2026-4421 Linux Kernel Privilege Escalation Exploit Weaponized Python Suite",
                    "price_btc": 0.045,
                    "price_usd": 2850,
                    "category": "Zero-Day Exploits & Vulnerability Tooling",
                    "rating": 4.98,
                    "reviews_count": 34,
                    "published_at": "2026-08-16 12:00:00",
                    "description": """Full weaponized Python automated exploit suite targeting CVE-2026-4421 (Linux Kernel eBPF bounds verification bypass).

CAPABILITIES:
- Reliable unprivileged local root elevation across Linux Kernel 6.1 through 6.8
- Deterministic bypass for KASLR, SMEP, SMAP, and SELinux/AppArmor enforcements
- Execution time: < 1.2 seconds to uid=0 root shell
- Delivery includes Python weaponization script, C harness, compilation instructions, and clean cleanup routines.

ESCROW & PAYMENT:
- Mandatory NightMarket Escrow. Funds held until proof of root shell delivery.
- Deposit Address: bc1q9h5yjqk3chz8gxlnqr5t7gwj5m4e2k9xcd4vf
- Monero Address: 888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsLTBhPpH5t6SenQA6nfEQRzs9c8qAA2xKSnVW7K29ymzP1cqdHq8
- Inquiries & Support: shadow_vendor@secmail.pro (PGP Key: 7A3F 9B2E 1C4D 5E6F 8A9B 0C1D 2E3F 4A5B 6C7D 8E9F)"""
                },
                {
                    "id": 102,
                    "title": "Hardened Anti-Forensic Live OS USB Deployment (Custom Tails + Whonix KVM Gateway)",
                    "price_btc": 0.0035,
                    "price_usd": 220,
                    "category": "Operational Security & Privacy Hardware",
                    "rating": 4.88,
                    "reviews_count": 89,
                    "published_at": "2026-08-18 15:30:00",
                    "description": """Turn-key encrypted USB image with hardened operating system.
Features memory wiper on emergency removal, custom Tor snowflake pluggable transports, pre-configured PGP suite, and randomized MAC telemetry.
Support via PGP: shadow_vendor@secmail.pro | BTC: bc1q9h5yjqk3chz8gxlnqr5t7gwj5m4e2k9xcd4vf"""
                }
            ]
        },
        "cryptosmith": {
            "vendor_name": "cryptosmith",
            "tier": "Level 3 — Verified Vendor",
            "rating": 4.82,
            "sales_count": 412,
            "joined": "2026-02-14",
            "pgp": "B4C5 D6E7 F8A9 0B1C 2D3E 4F5A 6B7C 8D9E 0F1A 2B3C",
            "btc": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "contact": "nullbyte_ops@protonmail.com",
            "telegram": "@nullbyte_core",
            "bio": """Cryptocurrency tumbler and financial privacy brokerage. Known on DarkGate Underground as nullbyte.
Operating high-velocity cross-chain liquidity pools (BTC to XMR to BTC). Automated time-delay outputs with zero logs retention.""",
            "listings": [
                {
                    "id": 201,
                    "title": "High-Volume Multi-Hop Cryptocurrency Tumbler (BTC/XMR Automated Cleaning)",
                    "price_btc": 0.0015,
                    "price_usd": 95,
                    "category": "Financial Privacy & Tumbling Services",
                    "rating": 4.85,
                    "reviews_count": 112,
                    "published_at": "2026-08-22 19:45:00",
                    "description": """Professional cross-chain tumbling service. Breaks deterministic blockchain taint through multi-hop Monero intermediate pools.
Fee: 1.5% per hop. Fully automated API and web submission.
Deposit Address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
Contact: nullbyte_ops@protonmail.com | Telegram @nullbyte_core"""
                }
            ]
        },
        "darkpulse": {
            "vendor_name": "darkpulse",
            "tier": "Level 2 — Active Vendor",
            "rating": 4.65,
            "sales_count": 98,
            "joined": "2026-03-10",
            "btc": "bc1qxyz789defabc456ghi012jkl345mno678pqr9st",
            "contact": "darkpulse@secmail.pro",
            "bio": """Corporate network security testing datasets, OSINT dossiers, and active directory credential dumps.""",
            "listings": [
                {
                    "id": 301,
                    "title": "Corporate Active Directory Domain Credentials & Internal Network Dump",
                    "price_btc": 0.008,
                    "price_usd": 510,
                    "category": "Data Dumps & Corporate Intelligence",
                    "rating": 4.70,
                    "reviews_count": 18,
                    "published_at": "2026-08-25 21:10:00",
                    "description": """Internal corporate directory credential dump from financial institutions.
Contains NTLM hashes, user emails, and internal DNS hostnames. Sample published on DeadDrop paste #p003.
Contact: darkpulse@secmail.pro | BTC: bc1qxyz789defabc456ghi012jkl345mno678pqr9st"""
                }
            ]
        }
    },
    "reviews": [
        {
            "id": 501,
            "vendor": "shadow_vendor",
            "buyer": "BetaBuyer_99",
            "rating": 5,
            "date": "2026-08-17 14:22:00",
            "listing_title": "CVE-2026-4421 Linux Kernel Privilege Escalation Exploit Weaponized Python Suite",
            "comment": "+1 vouch for shadow_vendor. Payload worked on first execution without crashing the target daemon. Escrow released smoothly."
        },
        {
            "id": 502,
            "vendor": "shadow_vendor",
            "buyer": "CryptoKangaroo",
            "rating": 5,
            "date": "2026-08-19 18:40:00",
            "listing_title": "Hardened Anti-Forensic Live OS USB Deployment",
            "comment": "Custom Tails build boots cleanly and wipes RAM on pull. Excellent vendor communication via secmail."
        },
        {
            "id": 503,
            "vendor": "cryptosmith",
            "buyer": "CipherOps",
            "rating": 5,
            "date": "2026-08-24 22:15:00",
            "listing_title": "High-Volume Multi-Hop Cryptocurrency Tumbler",
            "comment": "Tumbled 0.5 BTC into clean outputs across 6 randomized delays. Very low fee, solid OPSEC."
        }
    ]
}

MARKET_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ page_title }} — {{ site_name }}</title>
    <style>
        :root {
            --bg-body: #0d0f14;
            --bg-panel: #141721;
            --bg-subtle: #1c202d;
            --border-line: #272d3f;
            --border-highlight: #3c4560;
            --text-primary: #e2e8f0;
            --text-secondary: #94a3b8;
            --market-gold: #f59e0b;
            --market-green: #10b981;
            --market-blue: #38bdf8;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: var(--bg-body);
            color: var(--text-primary);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
            font-size: 13px;
        }
        a { color: var(--market-blue); text-decoration: none; }
        a:hover { text-decoration: underline; color: #7dd3fc; }
        .top-notice {
            background: #080a0e;
            border-bottom: 1px solid var(--border-line);
            padding: 6px 24px;
            font-size: 11px;
            color: var(--text-secondary);
            display: flex;
            justify-content: space-between;
        }
        .header {
            background: var(--bg-panel);
            border-bottom: 2px solid var(--border-highlight);
            padding: 16px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            font-size: 20px;
            font-family: monospace;
            font-weight: 700;
            color: #f8fafc;
        }
        .header h1 span { color: var(--market-gold); }
        .nav-links {
            background: #11141c;
            border-bottom: 1px solid var(--border-line);
            padding: 10px 24px;
            display: flex;
            gap: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .nav-links a { color: var(--text-primary); }
        .nav-links a:hover { color: var(--market-gold); }
        .container {
            max-width: 1080px;
            margin: 24px auto;
            padding: 0 16px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }
        .stat-card {
            background: var(--bg-panel);
            border: 1px solid var(--border-line);
            border-radius: 6px;
            padding: 12px 16px;
        }
        .stat-card .label { font-size: 10px; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; }
        .stat-card .value { font-size: 15px; font-weight: 700; color: #f8fafc; margin-top: 2px; font-family: monospace; }
        .listing-card {
            background: var(--bg-panel);
            border: 1px solid var(--border-line);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .listing-card:hover { border-color: var(--border-highlight); background: #161a25; }
        .listing-info { flex: 1; margin-right: 20px; }
        .listing-title { font-size: 15px; font-weight: 600; color: #f8fafc; margin-bottom: 4px; }
        .listing-category { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; }
        .listing-desc { font-size: 12px; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap; }
        .price-badge {
            background: var(--bg-subtle);
            border: 1px solid var(--border-line);
            border-radius: 6px;
            padding: 12px 18px;
            text-align: right;
            min-width: 170px;
        }
        .price-btc { font-size: 16px; font-weight: 700; color: var(--market-gold); font-family: monospace; }
        .price-usd { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
        .vendor-badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 2px 7px;
            border-radius: 4px;
            background: rgba(245, 158, 11, 0.15);
            color: var(--market-gold);
            border: 1px solid rgba(245, 158, 11, 0.3);
            margin-left: 6px;
            font-family: monospace;
        }
        .footer {
            border-top: 1px solid var(--border-line);
            padding: 24px 0;
            text-align: center;
            font-size: 11px;
            color: var(--text-secondary);
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="top-notice">
        <span>SECURITY: MULTI-SIG 2-OF-3 ESCROW ACTIVE</span>
        <span>CLEAN CIRCUIT &bull; ONION PROTOCOL V3</span>
    </div>
    <header class="header">
        <h1>&#9878; <span>NightMarket</span> Escrow Platform</h1>
        <div style="font-size:11px;color:var(--text-secondary);font-family:monospace;">Mirror: {{ stats.market_mirror }}</div>
    </header>
    <nav class="nav-links">
        <a href="/">Catalog</a>
        <a href="/vendors">Verified Vendors</a>
        <a href="/reviews">Buyer Feedback</a>
        <a href="/escrow">Escrow Terms</a>
        <a href="/rules">Policy</a>
    </nav>
    <main class="container">
        {{ content | safe }}
    </main>
    <footer class="footer">
        NightMarket &copy; 2026 &bull; Escrow Protection &bull; Zero Logs &bull; Onion Network
    </footer>
</body>
</html>"""

@app.after_request
def apply_headers(response):
    response.headers["Server"] = "Apache/2.4.52 (Ubuntu)"
    response.headers["X-Powered-By"] = "PHP/8.1.2"
    return response


@app.route("/")
def catalog():
    st = MARKET_DATA["stats"]
    stats_html = f"""<div class="stats-grid">
        <div class="stat-card"><div class="label">Escrow In Safe</div><div class="value" style="color:var(--market-gold);">{st['escrow_locked_btc']}</div></div>
        <div class="stat-card"><div class="label">Active Listings</div><div class="value">{st['active_listings']}</div></div>
        <div class="stat-card"><div class="label">Verified Vendors</div><div class="value">{st['verified_vendors']}</div></div>
        <div class="stat-card"><div class="label">Disputes Cleared</div><div class="value" style="color:var(--market-green);">{st['disputes_resolved']}</div></div>
    </div>"""

    listings_html = '<h2 style="font-size:16px;color:#f8fafc;font-family:monospace;margin-bottom:14px;">Featured Marketplace Inventory</h2>'

    for vkey, vdata in MARKET_DATA["vendors"].items():
        for item in vdata["listings"]:
            listings_html += f"""<article class="listing-card product_listing" id="listing-{item['id']}">
                <div class="listing-info">
                    <div class="listing-title">
                        <a href="/listing/{item['id']}">{item['title']}</a>
                    </div>
                    <div class="listing-category">
                        Category: <strong>{item['category']}</strong> &bull;
                        Vendor: <a href="/vendor/{vkey}" class="author post-author" style="font-family:monospace;font-weight:700;">@{vkey}</a>
                        <span class="vendor-badge">{vdata['tier']}</span> &bull;
                        Rating: <strong style="color:var(--market-gold);">&#9733; {item['rating']}</strong> ({item['reviews_count']} reviews) &bull;
                        Listed: <time class="post-date" datetime="{item['published_at']}">{item['published_at']} UTC</time>
                    </div>
                    <div class="listing-desc">{item['description']}</div>
                </div>
                <div class="price-badge">
                    <div class="price-btc">&#8383; {item['price_btc']} BTC</div>
                    <div class="price-usd">&asymp; ${item['price_usd']} USD</div>
                    <div style="font-size:10px;color:var(--market-green);margin-top:6px;font-weight:600;">ESCROW PROTECTED</div>
                </div>
            </article>"""

    return render_template_string(MARKET_TEMPLATE, page_title="Catalog", site_name=MARKET_DATA["site_name"], stats=st, content=stats_html + listings_html)


@app.route("/listing/<int:item_id>")
def listing_view(item_id):
    for vkey, vdata in MARKET_DATA["vendors"].items():
        for item in vdata["listings"]:
            if item["id"] == item_id:
                html = f"""<div class="listing-card product_listing" style="display:block;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
                        <div>
                            <h2 style="font-size:18px;color:#f8fafc;font-family:monospace;">{item['title']}</h2>
                            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">
                                Listed: <time class="post-date" datetime="{item['published_at']}">{item['published_at']} UTC</time> &bull;
                                Category: {item['category']}
                            </div>
                        </div>
                        <div class="price-badge">
                            <div class="price-btc">&#8383; {item['price_btc']} BTC</div>
                            <div class="price-usd">&asymp; ${item['price_usd']} USD</div>
                        </div>
                    </div>
                    <div class="listing-desc" style="background:var(--bg-subtle);padding:14px;border-radius:6px;border:1px solid var(--border-line);margin-bottom:16px;">
                        {item['description']}
                    </div>
                    <div style="font-size:12px;display:flex;gap:12px;">
                        <div style="flex:1;background:var(--bg-subtle);padding:10px;border-radius:4px;border:1px solid var(--border-line);">
                            <div style="color:var(--text-secondary);font-size:10px;text-transform:uppercase;">Vendor Operator</div>
                            <div style="font-family:monospace;font-weight:700;margin-top:2px;">@{vkey} ({vdata['tier']})</div>
                        </div>
                        <div style="flex:1;background:var(--bg-subtle);padding:10px;border-radius:4px;border:1px solid var(--border-line);">
                            <div style="color:var(--text-secondary);font-size:10px;text-transform:uppercase;">Encrypted Mail</div>
                            <div style="font-family:monospace;margin-top:2px;">{vdata['contact']}</div>
                        </div>
                    </div>
                </div>"""
                return render_template_string(MARKET_TEMPLATE, page_title=item["title"], site_name=MARKET_DATA["site_name"], stats=MARKET_DATA["stats"], content=html)
    return "Listing not found", 404


@app.route("/vendors")
def vendors_list():
    html = '<h2 style="font-size:16px;color:#f8fafc;font-family:monospace;margin-bottom:14px;">Authorized Vendor Profiles</h2>'
    for vkey, v in MARKET_DATA["vendors"].items():
        html += f"""<div class="listing-card seller_profile" style="display:block;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div>
                    <span style="font-size:16px;font-family:monospace;font-weight:700;color:#f8fafc;" class="author post-author">@{vkey}</span>
                    <span class="vendor-badge">{v['tier']}</span>
                </div>
                <div style="font-size:12px;font-family:monospace;color:var(--market-gold);">&#9733; {v['rating']} ({v['sales_count']} Sales)</div>
            </div>
            <p style="font-size:12px;color:var(--text-primary);line-height:1.5;margin-bottom:12px;">{v['bio']}</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;font-family:monospace;">
                <div style="background:var(--bg-subtle);padding:8px;border-radius:4px;border:1px solid var(--border-line);">
                    <span style="color:var(--text-secondary);">Deposit BTC:</span> <span style="word-break:break-all;">{v['btc']}</span>
                </div>
                <div style="background:var(--bg-subtle);padding:8px;border-radius:4px;border:1px solid var(--border-line);">
                    <span style="color:var(--text-secondary);">Contact:</span> <span>{v['contact']}</span>
                </div>
            </div>
        </div>"""
    return render_template_string(MARKET_TEMPLATE, page_title="Vendors", site_name=MARKET_DATA["site_name"], stats=MARKET_DATA["stats"], content=html)


@app.route("/vendor/<vkey>")
def vendor_detail(vkey):
    v = MARKET_DATA["vendors"].get(vkey)
    if not v:
        return "Vendor not found", 404
    html = f"""<div class="listing-card seller_profile" style="display:block;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <h2 style="font-size:18px;font-family:monospace;color:#f8fafc;">@{vkey} <span class="vendor-badge">{v['tier']}</span></h2>
            <div style="color:var(--market-gold);font-family:monospace;font-size:13px;">&#9733; {v['rating']} ({v['sales_count']} orders)</div>
        </div>
        <p style="font-size:13px;line-height:1.6;margin-bottom:16px;">{v['bio']}</p>
        <div style="background:var(--bg-subtle);padding:12px;border-radius:6px;border:1px solid var(--border-line);font-family:monospace;font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><strong>PGP Key:</strong> {v.get('pgp', 'None')}</div>
            <div><strong>Mail:</strong> {v['contact']}</div>
            <div><strong>BTC Escrow:</strong> {v['btc']}</div>
            <div><strong>XMR Address:</strong> {v.get('xmr', 'None')}</div>
        </div>
    </div>"""
    return render_template_string(MARKET_TEMPLATE, page_title=f"Vendor: {vkey}", site_name=MARKET_DATA["site_name"], stats=MARKET_DATA["stats"], content=html)


@app.route("/reviews")
def reviews_view():
    html = '<h2 style="font-size:16px;color:#f8fafc;font-family:monospace;margin-bottom:14px;">Recent Verified Buyer Vouches</h2>'
    for r in MARKET_DATA["reviews"]:
        html += f"""<div class="listing-card" style="display:block;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <div>
                    <span style="color:var(--market-gold);font-weight:700;">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                    <strong style="font-family:monospace;margin-left:8px;">{r['buyer']}</strong> &bull;
                    <span style="color:var(--text-secondary);font-size:11px;">Vendor: <a href="/vendor/{r['vendor']}">@{r['vendor']}</a></span>
                </div>
                <time class="post-date" datetime="{r['date']}" style="font-size:11px;color:var(--text-secondary);font-family:monospace;">{r['date']} UTC</time>
            </div>
            <div style="font-size:11px;color:var(--market-blue);margin-bottom:6px;">Item: {r['listing_title']}</div>
            <p style="font-size:12px;color:var(--text-primary);">{r['comment']}</p>
        </div>"""
    return render_template_string(MARKET_TEMPLATE, page_title="Vouches", site_name=MARKET_DATA["site_name"], stats=MARKET_DATA["stats"], content=html)


@app.route("/escrow")
def escrow_terms():
    html = """<div class="listing-card" style="display:block;">
        <h2 style="font-size:16px;font-family:monospace;color:#f8fafc;margin-bottom:12px;">NightMarket Multi-Sig Escrow Mechanism</h2>
        <p style="line-height:1.7;color:var(--text-primary);font-size:13px;">
            1. Every trade generates a distinct 2-of-3 Bitcoin multi-signature script signed by Buyer, Vendor, and Market Arbiter.<br>
            2. Funds remain cryptographic locked until the buyer inspects the delivered exploit payload or software release.<br>
            3. Finalize Early (FE) is prohibited for all vendors below Tier Level 5.<br>
            4. In the event of dispute, PGP-signed test logs must be submitted to cipher_queen or market admin.
        </p>
    </div>"""
    return render_template_string(MARKET_TEMPLATE, page_title="Escrow Terms", site_name=MARKET_DATA["site_name"], stats=MARKET_DATA["stats"], content=html)


@app.route("/rules")
def market_rules():
    html = """<div class="listing-card" style="display:block;">
        <h2 style="font-size:16px;font-family:monospace;color:#f8fafc;margin-bottom:12px;">Market Operational Regulations</h2>
        <p style="line-height:1.7;color:var(--text-primary);font-size:13px;">
            - Strictly permitted: 0-day research, defensive penetration testing frameworks, OSINT archives, financial tumbling.<br>
            - Strictly forbidden: CSAM, biological/chemical threats, lethal weapons, hitman services.<br>
            - Clean PGP compliance is strictly audited on a monthly cycle.
        </p>
    </div>"""
    return render_template_string(MARKET_TEMPLATE, page_title="Regulations", site_name=MARKET_DATA["site_name"], stats=MARKET_DATA["stats"], content=html)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
