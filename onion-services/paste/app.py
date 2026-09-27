"""
Synthetic Darknet Paste Service — "DeadDrop Paste"
Realistic darknet pastebin inspired by StrongPaste and DeepPaste.
Hosts authentic 4096-bit PGP public key blocks, technical data disclosures,
and identity cross-reference dossiers.
"""
from flask import Flask, render_template_string, Response
import werkzeug.serving
import html
from datetime import datetime

werkzeug.serving.WSGIRequestHandler.server_version = "nginx/1.24.0"
werkzeug.serving.WSGIRequestHandler.sys_version = ""

app = Flask(__name__)

PASTES = [
    {
        "id": "p001",
        "title": "shadowfox — Master PGP Public Key & Cross-Platform Proof",
        "author": "shadowfox",
        "date": "2025-11-05 21:14:00",
        "category": "PGP Keys & Identity",
        "views": 1842,
        "content": """-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: GnuPG v2.2.40 (GNU/Linux)

mQINBGe9w1YBEADJ2g8O7hB9e3v4n6q7r8s9t0y1u2v3w4x5y6z7a8b9c0d1e2f3
g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5
m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7
s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9
y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1
e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9g0h1i2j3
k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5
q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v7
w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9
c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9g0h1
=v9X2
-----END PGP PUBLIC KEY BLOCK-----

KEY SPECIFICATIONS:
Fingerprint: 7A3F 9B2E 1C4D 5E6F 8A9B 0C1D 2E3F 4A5B 6C7D 8E9F
Primary UID: shadowfox <shadowfox@secmail.pro>
Algorithm: RSA 4096 / SHA-512
Created: 2025-11-03 18:00:00 UTC
Status: ACTIVE / VERIFIED

CROSS-PLATFORM IDENTITY MAPPINGS:
- DarkGate Forum: @shadowfox
- NightMarket Vendor Profile: @shadow_vendor (Level 5 Trusted)
- Encrypted Contact Email: shadowfox@secmail.pro
- Telegram Direct Handle: @shadowfox_sec
- Primary Bitcoin Escrow Wallet: bc1q9h5yjqk3chz8gxlnqr5t7gwj5m4e2k9xcd4vf
- Primary Monero Escrow Wallet: 888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsLTBhPpH5t6SenQA6nfEQRzs9c8qAA2xKSnVW7K29ymzP1cqdHq8

NOTICE:
Any communications or signed exploit advisories not bearing this key's digital signature are fraudulent."""
    },
    {
        "id": "p002",
        "title": "nullbyte / cryptosmith — PGP Public Key & Migration Proof",
        "author": "nullbyte",
        "date": "2026-01-20 03:45:00",
        "category": "PGP Keys & Identity",
        "views": 984,
        "content": """-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: GnuPG v2.2.40 (GNU/Linux)

mQINBGeN01YBEAC6b4Y2M5dPz1R2mP1A4q7X3vU9k+6bYrF4d8nQ2hS5L1oP3wK7
m+X0iA6jC9eR8yV2nU5tO4pB3gF1hW0kJ7dN9xQ8Z4Y5X6W7V3U2T1S0R9Q8P7O6
N5M4L3K2J1I0H9G8F7E6D5C4B3A2Y7X6W5V4U3T2S1R0Q9P8O7N6M5L4K3J2I1H0
G9F8E7D6C5B4A3Z2hR2mP1A4q7X3vU9k+6bYrF4d8nQ2hS5L1oP3wK7m+X0iA6jC
9eR8yV2nU5tO4pB3gF1hW0kJ7dN9xQ8Z4Y5X6W7V3U2T1S0R9Q8P7O6N5M4L3K2J
=f4A1
-----END PGP PUBLIC KEY BLOCK-----

KEY SPECIFICATIONS:
Fingerprint: B4C5 D6E7 F8A9 0B1C 2D3E 4F5A 6B7C 8D9E 0F1A 2B3C
Primary UID: nullbyte <nullbyte_ops@protonmail.com>
Algorithm: RSA 4096
Created: 2026-01-17 12:00:00 UTC

IDENTITY DETAILS:
Operating as @nullbyte on DarkGate Underground.
Operating as @cryptosmith on NightMarket (tumbling service).
        Deposit Address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"""
    },
    {
        "id": "p003",
        "title": "Market Vendor Identity Cross-Reference & Vouch Matrix — Q3 2026",
        "author": "cipher_queen",
        "date": "2026-09-05 14:10:00",
        "category": "Community Intelligence",
        "views": 1540,
        "content": """DARKGATE UNDERGROUND :: VENDOR IDENTITY CORRELATION REPORT
Compiled by cipher_queen <cipherqueen@dnmx.org>
PGP Fingerprint: 1A2B 3C4D 5E6F 7A8B 9C0D 1E2F 3A4B 5C6D 7E8F 9A0B
BTC: bc1q5ggd80aerg2mvszgr0k3rh2l8fklkjm5y3s0dz

CROSS-PLATFORM VENDOR MAPPINGS:

1. OPERATOR: shadowfox
   - DarkGate Handle: @shadowfox
   - NightMarket Vendor: @shadow_vendor
   - Verified PGP: 7A3F 9B2E 1C4D 5E6F 8A9B 0C1D 2E3F 4A5B 6C7D 8E9F
   - Verified Email: shadowfox@secmail.pro
   - Primary Bitcoin Wallet: bc1q9h5yjqk3chz8gxlnqr5t7gwj5m4e2k9xcd4vf
   - Primary Monero Wallet: 888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsLTBhPpH5t6SenQA6nfEQRzs9c8qAA2xKSnVW7K29ymzP1cqdHq8
   - Attestation: Confirmed same operator. Signature matches across all advisory bulletins.

2. OPERATOR: nullbyte
   - DarkGate Handle: @nullbyte
   - NightMarket Vendor: @cryptosmith
   - Verified PGP: B4C5 D6E7 F8A9 0B1C 2D3E 4F5A 6B7C 8D9E 0F1A 2B3C
   - Verified Email: nullbyte_ops@protonmail.com
   - Bitcoin Wallet: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
   - Attestation: Confirmed same operator. High reputation mixing liquidity pool."""
    }
]

PASTE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ page_title }} — DeadDrop</title>
    <style>
        :root {
            --bg-canvas: #0b0c0e;
            --bg-panel: #121418;
            --bg-code: #08090b;
            --border-subtle: #20242c;
            --border-highlight: #333a46;
            --text-regular: #cbd5e1;
            --text-dimmed: #64748b;
            --accent-green: #22c55e;
            --accent-cyan: #38bdf8;
            --accent-amber: #f59e0b;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: var(--bg-canvas);
            color: var(--text-regular);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
            font-size: 13px;
        }
        a { color: var(--accent-cyan); text-decoration: none; }
        a:hover { text-decoration: underline; color: #7dd3fc; }
        .banner {
            background: #060708;
            border-bottom: 1px solid var(--border-subtle);
            padding: 5px 24px;
            font-size: 11px;
            color: var(--text-dimmed);
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
            color: #f1f5f9;
        }
        .header h1 span { color: var(--accent-green); }
        .nav-menu {
            background: #0e1014;
            border-bottom: 1px solid var(--border-subtle);
            padding: 9px 24px;
            display: flex;
            gap: 18px;
            font-size: 12px;
            font-weight: 600;
        }
        .nav-menu a { color: var(--text-regular); }
        .nav-menu a:hover { color: var(--accent-green); }
        .main-content {
            max-width: 1040px;
            margin: 20px auto;
            padding: 0 16px;
        }
        .paste-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .paste-table th {
            background: #171a20;
            padding: 10px 16px;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-dimmed);
            border-bottom: 1px solid var(--border-subtle);
        }
        .paste-table td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-subtle);
            vertical-align: middle;
        }
        .paste-table tr:hover { background: #181b22; }
        .paste-title { font-size: 14px; font-weight: 600; }
        .paste-box {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .paste-box-header {
            background: #161920;
            border-bottom: 1px solid var(--border-subtle);
            padding: 12px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .paste-content-code {
            background: var(--bg-code);
            padding: 18px;
            font-family: "Courier New", Courier, monospace;
            font-size: 12px;
            line-height: 1.6;
            color: #86efac;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-x: auto;
        }
        .btn-raw {
            background: #202530;
            color: var(--text-regular);
            border: 1px solid var(--border-subtle);
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
        }
        .btn-raw:hover { background: #282f3d; color: #fff; text-decoration: none; }
        .footer {
            border-top: 1px solid var(--border-subtle);
            padding: 24px 0;
            text-align: center;
            font-size: 11px;
            color: var(--text-dimmed);
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="banner">
        <span>ENCRYPTED MONOSPACE PASTEBIN :: MEMORY ENCRYPTED BUFFER</span>
        <span>TOR HIDDEN SERVICE PROTOCOL</span>
    </div>
    <header class="header">
        <h1>&#9670; <span>DeadDrop</span> Pastebin</h1>
        <div style="font-size:11px;color:var(--text-dimmed);font-family:monospace;">AES-256 Memory Buffer &bull; Ephemeral &bull; Tor Native</div>
    </header>
    <nav class="nav-menu">
        <a href="/">Archive</a>
        <a href="/pgp">Public Keys</a>
        <a href="/rules">Terms</a>
    </nav>
    <main class="main-content">
        {{ content | safe }}
    </main>
    <footer class="footer">
        DeadDrop &copy; 2026 &bull; Cryptographic Intelligence &bull; Anonymous Archive
    </footer>
</body>
</html>"""

@app.route("/")
def index():
    html = '<h2 style="font-size:16px;color:#f1f5f9;font-family:monospace;margin-bottom:14px;">Recent Public Paste Disclosures</h2>'
    html += '<table class="paste-table"><thead><tr><th>Paste Title</th><th>Author</th><th>Category</th><th>Views</th><th>Timestamp</th></tr></thead><tbody>'
    for p in PASTES:
        html += f"""<tr>
            <td>
                <div class="paste-title"><a href="/paste/{p['id']}">{p['title']}</a></div>
            </td>
            <td><span class="author post-author" style="font-family:monospace;font-weight:600;">@{p['author']}</span></td>
            <td><span style="font-size:11px;color:var(--text-dimmed);">{p['category']}</span></td>
            <td style="font-family:monospace;font-size:11px;">{p['views']}</td>
            <td><time class="post-date" datetime="{p['date']}">{p['date']} UTC</time></td>
        </tr>"""
    html += '</tbody></table>'
    return render_template_string(PASTE_TEMPLATE, page_title="Archive", content=html)


@app.route("/paste/<paste_id>")
def view_paste(paste_id):
    p = next((p for p in PASTES if p["id"] == paste_id), None)
    if not p:
        return "Paste not found", 404

    b_type = "pgp_information" if "PGP" in p["title"] else "general_content"

    html = f"""<article class="paste-box {b_type}">
        <div class="paste-box-header">
            <div>
                <h2 style="font-size:16px;color:#f1f5f9;font-family:monospace;margin-bottom:4px;">{p['title']}</h2>
                <div style="font-size:11px;color:var(--text-dimmed);">
                    Author: <strong class="author post-author" style="color:var(--accent-cyan);">@{p['author']}</strong> &bull;
                    Category: <strong>{p['category']}</strong> &bull;
                    Created: <time class="post-date" datetime="{p['date']}">{p['date']} UTC</time>
                </div>
            </div>
            <div>
                <a href="/raw/{p['id']}" class="btn-raw" target="_blank">RAW View</a>
            </div>
        </div>
        <pre class="paste-content-code">{html.escape(p['content'])}</pre>
    </article>"""
    return render_template_string(PASTE_TEMPLATE, page_title=p["title"], content=html)


@app.route("/raw/<paste_id>")
def raw_paste(paste_id):
    p = next((p for p in PASTES if p["id"] == paste_id), None)
    if not p:
        return "Paste not found", 404
    return Response(p["content"], mimetype="text/plain")


@app.route("/pgp")
def pgp_pastes():
    html = '<h2 style="font-size:16px;color:#f1f5f9;font-family:monospace;margin-bottom:14px;">PGP Key Archive</h2>'
    html += '<table class="paste-table"><thead><tr><th>Key Title</th><th>Author</th><th>Fingerprint Sample</th><th>Date</th></tr></thead><tbody>'
    for p in PASTES:
        if "PGP" in p["title"]:
            html += f"""<tr class="pgp_information">
                <td><a href="/paste/{p['id']}" style="font-weight:600;">{p['title']}</a></td>
                <td><span class="author post-author" style="font-family:monospace;">@{p['author']}</span></td>
                <td style="font-family:monospace;font-size:11px;color:#86efac;">RSA 4096 / PGP Verified</td>
                <td><time class="post-date" datetime="{p['date']}">{p['date']} UTC</time></td>
            </tr>"""
    html += '</tbody></table>'
    return render_template_string(PASTE_TEMPLATE, page_title="PGP Keys", content=html)


@app.route("/rules")
def terms():
    html = """<div class="paste-box" style="padding:20px;">
        <h2 style="font-size:16px;color:#f1f5f9;font-family:monospace;margin-bottom:12px;">Paste Archive Policy</h2>
        <p style="line-height:1.7;color:var(--text-regular);font-size:13px;">
            DeadDrop is an encrypted public bulletin for PGP verification and vulnerability research disclosures.<br>
            All submitted keys remain in memory buffer with SHA-256 immutability verification.
        </p>
    </div>"""
    return render_template_string(PASTE_TEMPLATE, page_title="Terms", content=html)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
