"""
Synthetic Darknet Forum — "DarkGate Underground"
Realistic darknet bulletin board inspired by Dread and Exploit.in.
Features realistic dark retro aesthetic, technical exploit disclosures, vouches,
authentic publication timestamps, PGP signed advisories, and cross-platform identity anchors.
"""
from flask import Flask, render_template_string, Response
import werkzeug.serving
from datetime import datetime

werkzeug.serving.WSGIRequestHandler.server_version = "nginx/1.22.0"
werkzeug.serving.WSGIRequestHandler.sys_version = ""

app = Flask(__name__)

FORUM_DATA = {
    "site_name": "DarkGate Underground",
    "site_stats": {
        "registered_members": 2419,
        "threads": 412,
        "posts": 18450,
        "online_users": 47,
        "tor_status": "OPERATIONAL / 0.4.8.10"
    },
    "users": {
        "shadowfox": {
            "joined": "2025-11-03",
            "posts": 347,
            "reputation": "+142",
            "pgp": "7A3F 9B2E 1C4D 5E6F 8A9B 0C1D 2E3F 4A5B 6C7D 8E9F",
            "email": "shadowfox@secmail.pro",
            "telegram": "@shadowfox_sec",
            "btc": "bc1q9h5yjqk3chz8gxlnqr5t7gwj5m4e2k9xcd4vf",
            "xmr": "888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsLTBhPpH5t6SenQA6nfEQRzs9c8qAA2xKSnVW7K29ymzP1cqdHq8",
            "status": "trusted_vendor",
            "tagline": "Exploit Dev / Hardened Infrastructure / No Compromise"
        },
        "nullbyte": {
            "joined": "2026-01-17",
            "posts": 189,
            "reputation": "+84",
            "pgp": "B4C5 D6E7 F8A9 0B1C 2D3E 4F5A 6B7C 8D9E 0F1A 2B3C",
            "email": "nullbyte_ops@protonmail.com",
            "telegram": "@nullbyte_core",
            "btc": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "status": "vendor",
            "tagline": "Financial Anonymity & Cross-Chain Mixing"
        },
        "cipher_queen": {
            "joined": "2025-09-22",
            "posts": 512,
            "reputation": "+320",
            "pgp": "1A2B 3C4D 5E6F 7A8B 9C0D 1E2F 3A4B 5C6D 7E8F 9A0B",
            "email": "cipherqueen@dnmx.org",
            "telegram": "@cipher_mod",
            "btc": "bc1q5ggd80aerg2mvszgr0k3rh2l8fklkjm5y3s0dz",
            "status": "moderator",
            "tagline": "DarkGate Staff / Dispute Arbiter / Verified Signer"
        },
        "nightowl": {
            "joined": "2025-10-12",
            "posts": 218,
            "reputation": "+96",
            "pgp": "5D6E 7F8A 9B0C 1D2E 3F4A 5B6C 7D8E 9F0A 1B2C 3D4E",
            "email": "nightowl@dnmx.org",
            "telegram": "@nightowl_intel",
            "btc": "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
            "status": "member",
            "tagline": "OpSec Research & Network Forensics"
        },
        "darkpulse": {
            "joined": "2025-12-10",
            "posts": 73,
            "reputation": "+29",
            "email": "darkpulse@secmail.pro",
            "btc": "bc1qxyz789defabc456ghi012jkl345mno678pqr9st",
            "status": "member",
            "tagline": "Corporate Intelligence & Database Breaches"
        }
    },
    "threads": [
        {
            "id": 101,
            "title": "[0-DAY ADVISORY] CVE-2026-4421 Linux Kernel eBPF Local Privilege Escalation & Exploit POC",
            "category": "0-Day Exploits & Vulnerability Research",
            "author": "shadowfox",
            "date": "2026-08-15 17:34:00",
            "replies": 3,
            "posts": [
                {
                    "post_id": 1001,
                    "author": "shadowfox",
                    "date": "2026-08-15 17:34:00",
                    "body": """=== DARKGATE VULNERABILITY INTELLIGENCE BULLETIN ===
ID: CVE-2026-4421-POC
SEVERITY: CRITICAL (CVSSv3 8.8)
TARGET: Linux Kernel 6.1 through 6.8 (eBPF subsystem verifier bug)
AFFECTED: Ubuntu 22.04/24.04 LTS, Debian 12, RHEL 9 (unmitigated default configurations)

TECHNICAL OVERVIEW:
A flaw in the kernel/bpf/verifier.c logic allows unprivileged users to bypass bounds checking during register type propagation. By chaining a 32-bit arithmetic truncation with speculative branch execution, an unprivileged user space thread can obtain arbitrary kernel memory read/write primitives.

WEAPONIZATION:
The payload bypasses KASLR, SMEP, and SMAP deterministically in < 1.2 seconds.
Full weaponized automated exploitation framework is now available exclusively via NightMarket escrow.

PROOF OF IDENTITY & PGP SIGNED ADVISORY:
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

Advisory Release ID: CVE-2026-4421-SHADOWFOX
Author: shadowfox <shadowfox@secmail.pro>
Fingerprint: 7A3F 9B2E 1C4D 5E6F 8A9B 0C1D 2E3F 4A5B 6C7D 8E9F
BTC Escrow Wallet: bc1q9h5yjqk3chz8gxlnqr5t7gwj5m4e2k9xcd4vf
XMR Escrow Wallet: 888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsLTBhPpH5t6SenQA6nfEQRzs9c8qAA2xKSnVW7K29ymzP1cqdHq8
Telegram: @shadowfox_sec
I verify that all listings on NightMarket under shadow_vendor are operated by myself.
-----BEGIN PGP SIGNATURE-----
Version: GnuPG v2.2.40 (GNU/Linux)

iQIzBAEBCgAdFiEEej+bLhxNXm+KmwwdLj9KW2x9jp8FAmK9120ACgkQLj9KW2x9
jp+jYRAArj2h4dJk6x8p4k1m8n3p2q1w4e5r6t7y8u9i0o1p2a3s4d5f6g7h8j9k
0l1z2x3c4v5b6n7m8q9w0e1r2t3y4u5i6o7p8a9s0d1f2g3h4j5k6l7z8x9c0v1b
-----END PGP SIGNATURE-----

Inquiries via encrypted mail: shadowfox@secmail.pro or NightMarket listing #101."""
                },
                {
                    "post_id": 1002,
                    "author": "nullbyte",
                    "date": "2026-08-15 19:15:00",
                    "body": """+1 vouch for shadowfox.
We tested this payload in our testing lab on standard stock Ubuntu 24.04 kernel 6.8.0-31-generic. The root shell popped cleanly without triggering kernel panic or AppArmor alerts. Escrow was released instantly through NightMarket.

If paying with BTC, ensure you tumble before deposit. Contact me if you need cross-chain mixing to XMR: nullbyte_ops@protonmail.com or Telegram @nullbyte_core."""
                },
                {
                    "post_id": 1003,
                    "author": "nightowl",
                    "date": "2026-08-16 02:45:00",
                    "body": """Solid release. Verified the ring buffer allocation offset.
One operational security note for buyers: make sure your compilation toolchain doesn't leak compile host pathnames in the binary symbols. Run strip -s on the final binary before deploying."""
                },
                {
                    "post_id": 1004,
                    "author": "cipher_queen",
                    "date": "2026-08-16 11:20:00",
                    "body": """[STAFF NOTICE]
Vendor identity verified. PGP signature valid against master key on DeadDrop paste #p001.
Escrow bond confirmed at 0.05 BTC. Buyer protection applies to all transactions through NightMarket listing."""
                }
            ]
        },
        {
            "id": 102,
            "title": "[MARKET NEWS] SilkVault Marketplace Launch & Vendor Migration Status",
            "category": "Marketplace & Ecosystem Discussion",
            "author": "cipher_queen",
            "date": "2026-08-28 09:15:00",
            "replies": 1,
            "posts": [
                {
                    "post_id": 3001,
                    "author": "cipher_queen",
                    "date": "2026-08-28 09:15:00",
                    "body": """Community announcement regarding SilkVault:
SilkVault has launched a digital escrow service at silkvault2m4x7n3b.onion.
Several NightMarket vendors including shadow_vendor and cryptosmith are cross-listing inventory there.

All vendor migrations must maintain consistent PGP public keys. Cross-reference fingerprints against the master directory before transferring escrow funds."""
                },
                {
                    "post_id": 3002,
                    "author": "nullbyte",
                    "date": "2026-08-28 23:40:00",
                    "body": """Confirmed. Operating handle cryptosmith on NightMarket and SilkVault. PGP fingerprint B4C5 D6E7 F8A9 0B1C 2D3E 4F5A 6B7C 8D9E 0F1A 2B3C.
BTC: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
Always demand PGP signed payment invoices."""
                }
            ]
        }
    ]
}

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ page_title }} — {{ site_name }}</title>
    <style>
        :root {
            --bg-main: #0c0d10;
            --bg-card: #13151b;
            --bg-header: #181b24;
            --bg-subtle: #1c202b;
            --border-dim: #252a38;
            --border-bright: #3a4256;
            --text-main: #d1d5db;
            --text-muted: #8b949e;
            --accent-cyan: #38bdf8;
            --accent-green: #34d399;
            --accent-orange: #fb923c;
            --accent-purple: #c084fc;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: var(--bg-main);
            color: var(--text-main);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
            font-size: 13px;
            line-height: 1.5;
        }
        a { color: var(--accent-cyan); text-decoration: none; }
        a:hover { text-decoration: underline; color: #7dd3fc; }
        .top-banner {
            background: #090a0d;
            border-bottom: 1px solid var(--border-dim);
            padding: 6px 20px;
            font-size: 11px;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
        }
        .header {
            background: var(--bg-header);
            border-bottom: 2px solid var(--border-bright);
            padding: 14px 20px;
        }
        .header h1 {
            font-size: 19px;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: #f3f4f6;
            font-family: monospace;
        }
        .header h1 span { color: var(--accent-cyan); }
        .header .subtext {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 2px;
        }
        .nav-bar {
            background: var(--bg-card);
            border-bottom: 1px solid var(--border-dim);
            padding: 9px 20px;
            display: flex;
            gap: 18px;
            font-size: 12px;
            font-weight: 600;
        }
        .nav-bar a { color: var(--text-main); }
        .nav-bar a:hover { color: var(--accent-cyan); }
        .main-container {
            max-width: 1040px;
            margin: 20px auto;
            padding: 0 16px;
        }
        .stats-bar {
            background: var(--bg-card);
            border: 1px solid var(--border-dim);
            border-radius: 6px;
            padding: 10px 16px;
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-muted);
        }
        .stats-bar strong { color: #f3f4f6; }
        .forum-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--bg-card);
            border: 1px solid var(--border-dim);
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .forum-table th {
            background: var(--bg-subtle);
            padding: 10px 14px;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-muted);
            border-bottom: 1px solid var(--border-dim);
        }
        .forum-table td {
            padding: 12px 14px;
            border-bottom: 1px solid var(--border-dim);
            vertical-align: top;
        }
        .forum-table tr:hover { background: #161922; }
        .thread-title { font-size: 14px; font-weight: 600; }
        .thread-meta { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
        .post-card {
            background: var(--bg-card);
            border: 1px solid var(--border-dim);
            border-radius: 6px;
            margin-bottom: 14px;
            overflow: hidden;
        }
        .post-header {
            background: var(--bg-subtle);
            border-bottom: 1px solid var(--border-dim);
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .author-box { display: flex; align-items: center; gap: 8px; }
        .author-name { font-weight: 700; color: #f3f4f6; font-size: 13px; font-family: monospace; }
        .role-badge {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            font-family: monospace;
        }
        .badge-trusted_vendor { background: rgba(52, 211, 153, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
        .badge-vendor { background: rgba(251, 146, 60, 0.15); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.3); }
        .badge-moderator { background: rgba(192, 132, 252, 0.15); color: #c084fc; border: 1px solid rgba(192, 132, 252, 0.3); }
        .badge-member { background: rgba(156, 163, 175, 0.15); color: #9ca3af; border: 1px solid rgba(156, 163, 175, 0.3); }
        .post-timestamp { font-size: 11px; color: var(--text-muted); font-family: monospace; }
        .post-body {
            padding: 16px;
            font-size: 13px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .pgp-block {
            background: #08090c;
            border: 1px solid var(--border-dim);
            border-left: 3px solid var(--accent-green);
            padding: 12px;
            font-family: monospace;
            font-size: 11px;
            color: #86efac;
            margin: 12px 0;
            overflow-x: auto;
        }
        .footer {
            border-top: 1px solid var(--border-dim);
            padding: 24px 0;
            text-align: center;
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="top-banner">
        <span>SECURITY LEVEL: MAXIMUM :: ENCRYPTED ONION CIRCUIT</span>
        <span>TOR STATUS: {{ site_stats.tor_status }}</span>
    </div>
    <header class="header">
        <h1>&#9760; <span>DarkGate</span> Underground</h1>
        <div class="subtext">Vulnerability Disclosure, Zero-Day Research & Cryptographic Peer Exchange</div>
    </header>
    <nav class="nav-bar">
        <a href="/">Board Index</a>
        <a href="/members">Member Directory</a>
        <a href="/vendors">Verified Vendors</a>
        <a href="/pgp">PGP Key Directory</a>
        <a href="/rules">Manifesto & Rules</a>
    </nav>
    <main class="main-container">
        {{ content | safe }}
    </main>
    <footer class="footer">
        DarkGate Underground &copy; 2026 &bull; Strict PGP Enforcement &bull; No Logs &bull; Onion Hidden Service
    </footer>
</body>
</html>"""

@app.route("/")
def index():
    stats = FORUM_DATA["site_stats"]
    stats_html = f"""<div class="stats-bar">
        <div>Registered Members: <strong>{stats['registered_members']}</strong> &bull; Total Threads: <strong>{stats['threads']}</strong> &bull; Posts: <strong>{stats['posts']}</strong></div>
        <div>Online Operatives: <strong style="color:var(--accent-green);">{stats['online_users']}</strong></div>
    </div>"""

    threads_html = """<table class="forum-table">
        <thead>
            <tr>
                <th style="width: 60%;">Discussion Topic</th>
                <th>Author</th>
                <th>Replies</th>
                <th>Last Activity</th>
            </tr>
        </thead>
        <tbody>"""

    for t in FORUM_DATA["threads"]:
        threads_html += f"""<tr>
            <td>
                <div class="thread-title"><a href="/thread/{t['id']}">{t['title']}</a></div>
                <div class="thread-meta">Category: <span style="color:var(--text-main);">{t['category']}</span></div>
            </td>
            <td><a href="/user/{t['author']}" class="author post-author" style="font-family:monospace;font-weight:600;">{t['author']}</a></td>
            <td>{t['replies']}</td>
            <td><time class="post-date" datetime="{t['date']}">{t['date']} UTC</time></td>
        </tr>"""
    threads_html += "</tbody></table>"

    return render_template_string(HTML_TEMPLATE, page_title="Index", site_name=FORUM_DATA["site_name"], site_stats=stats, content=stats_html + threads_html)


@app.route("/thread/<int:thread_id>")
def thread(thread_id):
    t = next((t for t in FORUM_DATA["threads"] if t["id"] == thread_id), None)
    if not t:
        return "Thread not found", 404

    content_html = f"""<div style="margin-bottom:14px;">
        <h2 style="font-size:17px;color:#f3f4f6;font-family:monospace;margin-bottom:4px;">{t['title']}</h2>
        <div style="font-size:11px;color:var(--text-muted);">
            Category: <strong>{t['category']}</strong> &bull; Created: <time datetime="{t['date']}">{t['date']} UTC</time>
        </div>
    </div>"""

    for p in t["posts"]:
        author_info = FORUM_DATA["users"].get(p["author"], {})
        status = author_info.get("status", "member")
        role_label = status.replace("_", " ").title()

        content_html += f"""<article class="post-card post forum_post" id="post-{p['post_id']}">
            <div class="post-header">
                <div class="author-box">
                    <span class="author-name author post-author">@{p['author']}</span>
                    <span class="role-badge badge-{status}">{role_label}</span>
                    <span style="font-size:11px;color:var(--text-muted);font-family:monospace;">Rep: {author_info.get('reputation', '+0')}</span>
                </div>
                <time class="post-timestamp post-date" datetime="{p['date']}">{p['date']} UTC</time>
            </div>
            <div class="post-body">{p['body']}</div>
        </article>"""

    return render_template_string(HTML_TEMPLATE, page_title=t["title"], site_name=FORUM_DATA["site_name"], site_stats=FORUM_DATA["site_stats"], content=content_html)


@app.route("/members")
def members():
    html = '<h2 style="font-size:16px;color:#f3f4f6;margin-bottom:14px;font-family:monospace;">Member Directory</h2>'
    html += '<table class="forum-table"><thead><tr><th>User Handle</th><th>Role</th><th>Reputation</th><th>PGP Key</th><th>Joined</th></tr></thead><tbody>'
    for u, data in FORUM_DATA["users"].items():
        html += f"""<tr class="seller_profile">
            <td><a href="/user/{u}" class="author post-author" style="font-family:monospace;font-weight:700;">@{u}</a></td>
            <td><span class="role-badge badge-{data['status']}">{data['status']}</span></td>
            <td><strong style="color:var(--accent-green);">{data.get('reputation', '+0')}</strong></td>
            <td><span style="font-family:monospace;font-size:11px;">{data.get('pgp', 'Not linked')}</span></td>
            <td><time datetime="{data['joined']}">{data['joined']}</time></td>
        </tr>"""
    html += '</tbody></table>'
    return render_template_string(HTML_TEMPLATE, page_title="Members", site_name=FORUM_DATA["site_name"], site_stats=FORUM_DATA["site_stats"], content=html)


@app.route("/user/<username>")
def user_profile(username):
    user = FORUM_DATA["users"].get(username)
    if not user:
        return "User not found", 404

    html = f"""<div class="post-card seller_profile" style="padding:20px;">
        <h2 style="font-size:18px;color:#f3f4f6;font-family:monospace;margin-bottom:6px;">@{username}</h2>
        <div style="margin-bottom:16px;"><span class="role-badge badge-{user['status']}">{user['status'].upper()}</span> &bull; <span style="color:var(--accent-green);">Reputation: {user.get('reputation', '+0')}</span></div>
        <p style="font-style:italic;color:var(--text-muted);margin-bottom:18px;">"{user.get('tagline', '')}"</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;">
            <div style="background:var(--bg-subtle);padding:10px;border-radius:4px;border:1px solid var(--border-dim);">
                <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;">Primary PGP Fingerprint</div>
                <div style="font-family:monospace;color:#f3f4f6;margin-top:2px;">{user.get('pgp', 'None')}</div>
            </div>
            <div style="background:var(--bg-subtle);padding:10px;border-radius:4px;border:1px solid var(--border-dim);">
                <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;">Encrypted Contact</div>
                <div style="font-family:monospace;color:#f3f4f6;margin-top:2px;">{user.get('email', 'None')}</div>
            </div>
            <div style="background:var(--bg-subtle);padding:10px;border-radius:4px;border:1px solid var(--border-dim);">
                <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;">Bitcoin Escrow Deposit</div>
                <div style="font-family:monospace;color:#f3f4f6;margin-top:2px;word-break:break-all;">{user.get('btc', 'None')}</div>
            </div>
            <div style="background:var(--bg-subtle);padding:10px;border-radius:4px;border:1px solid var(--border-dim);">
                <div style="color:var(--text-muted);font-size:10px;text-transform:uppercase;">Monero Payment Address</div>
                <div style="font-family:monospace;color:#f3f4f6;margin-top:2px;word-break:break-all;">{user.get('xmr', 'None')}</div>
            </div>
        </div>
    </div>"""
    return render_template_string(HTML_TEMPLATE, page_title=f"User: {username}", site_name=FORUM_DATA["site_name"], site_stats=FORUM_DATA["site_stats"], content=html)


@app.route("/pgp")
def pgp_directory():
    html = '<h2 style="font-size:16px;color:#f3f4f6;margin-bottom:14px;font-family:monospace;">PGP Key Directory</h2>'
    for u, data in FORUM_DATA["users"].items():
        if "pgp" in data:
            html += f"""<div class="post-card pgp_information" style="padding:16px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <strong style="color:var(--accent-cyan);font-family:monospace;">@{u} &lt;{data.get('email', '')}&gt;</strong>
                    <span style="font-size:11px;color:var(--text-muted);font-family:monospace;">RSA 4096 / Verified</span>
                </div>
                <div style="font-family:monospace;font-size:11px;background:#08090c;padding:8px;border:1px solid var(--border-dim);color:#a7f3d0;">
                    Fingerprint: {data['pgp']}
                </div>
            </div>"""
    return render_template_string(HTML_TEMPLATE, page_title="PGP Directory", site_name=FORUM_DATA["site_name"], site_stats=FORUM_DATA["site_stats"], content=html)


@app.route("/rules")
def rules():
    html = """<div class="post-card" style="padding:20px;">
        <h2 style="font-size:16px;color:#f3f4f6;margin-bottom:12px;font-family:monospace;">DarkGate Operations Charter</h2>
        <ul style="padding-left:20px;line-height:1.8;color:var(--text-main);">
            <li>1. Mandatory PGP signature on all trade advisories and vendor representations.</li>
            <li>2. Multi-sig escrow is compulsory for any transaction exceeding 0.01 BTC.</li>
            <li>3. Weaponized exploit disclosures must include testbed environment details.</li>
            <li>4. Zero tolerance for harmful contraband, extortion, or unprovoked doxxing.</li>
        </ul>
    </div>"""
    return render_template_string(HTML_TEMPLATE, page_title="Charter", site_name=FORUM_DATA["site_name"], site_stats=FORUM_DATA["site_stats"], content=html)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
