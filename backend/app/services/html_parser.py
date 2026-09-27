"""
Semantic HTML Parser.
Cleans raw DOM and decomposes dark-web pages into structural semantic blocks
with XPath, CSS selector, DOM range, character offsets, and SHA-256 block hash.
"""
import re
import hashlib
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from bs4 import BeautifulSoup, Tag, NavigableString

logger = logging.getLogger(__name__)

# Irrelevant tags to strip
BOILERPLATE_TAGS = [
    "script", "style", "nav", "footer", "header", "aside",
    "noscript", "iframe", "svg", "button", "select", "form"
]

# Regex patterns to detect semantic block types from classes, IDs, or text
BLOCK_PATTERNS = {
    "pgp_information": re.compile(r"-----BEGIN PGP (PUBLIC KEY BLOCK|SIGNED MESSAGE)", re.IGNORECASE),
    "contact_information": re.compile(r"\b(contact|jabber|xmpp|telegram|tox|session|wickr|email)\b", re.IGNORECASE),
    "seller_profile": re.compile(r"\b(seller|vendor|merchant|profile|reputation|feedback|rating|trust score)\b", re.IGNORECASE),
    "product_listing": re.compile(r"\b(product|listing|item|price|escrow|ships from|ships to|stock)\b", re.IGNORECASE),
    "forum_post": re.compile(r"\b(post|message|thread|reply|author|joined|member)\b", re.IGNORECASE),
}


class ParsedBlock:
    def __init__(
        self,
        block_type: str,
        text_content: str,
        xpath: str,
        css_selector: str,
        dom_start: int,
        dom_end: int,
        char_start: int,
        char_end: int,
        block_hash: str,
        sequence_number: int,
        parent_index: Optional[int] = None,
        published_at: Optional[datetime] = None
    ):
        self.block_type = block_type
        self.text_content = text_content
        self.xpath = xpath
        self.css_selector = css_selector
        self.dom_start = dom_start
        self.dom_end = dom_end
        self.char_start = char_start
        self.char_end = char_end
        self.block_hash = block_hash
        self.sequence_number = sequence_number
        self.parent_index = parent_index
        self.published_at = published_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            "block_type": self.block_type,
            "text_content": self.text_content,
            "xpath": self.xpath,
            "css_selector": self.css_selector,
            "dom_start": self.dom_start,
            "dom_end": self.dom_end,
            "char_start": self.char_start,
            "char_end": self.char_end,
            "block_hash": self.block_hash,
            "sequence_number": self.sequence_number,
            "published_at": self.published_at.isoformat() if self.published_at else None,
        }


class SemanticHTMLParser:
    """Decomposes dark-web HTML into semantic blocks with provenance coordinates."""

    def __init__(self, parser_version: str = "nemesis-html-parser-v2"):
        self.parser_version = parser_version

    def parse(self, raw_html: str | bytes) -> Tuple[str, List[ParsedBlock]]:
        """
        Parse raw HTML.
        Returns:
            Tuple of (full_cleaned_text, List of ParsedBlock)
        """
        if isinstance(raw_html, bytes):
            raw_html = raw_html.decode("utf-8", errors="replace")

        soup = BeautifulSoup(raw_html, "html.parser")

        # Step 2: Remove irrelevant elements
        for tag_name in BOILERPLATE_TAGS:
            for tag in soup.find_all(tag_name):
                tag.decompose()

        # Extract full cleaned text
        body = soup.body or soup
        full_cleaned_text = body.get_text(separator="\n", strip=True)

        # Step 3: Detect candidate semantic elements
        candidate_tags = self._find_candidate_containers(body)

        blocks: List[ParsedBlock] = []
        seq = 0
        dom_counter = 0

        for candidate in candidate_tags:
            text = candidate.get_text(separator=" ", strip=True)
            if not text or len(text) < 15:
                continue

            # Check for PGP sub-blocks inside this element
            if "-----BEGIN PGP" in text and candidate.name not in ["pre", "code"]:
                # Look for pre or code with PGP
                pgp_subtags = candidate.find_all(["pre", "code"])
                for sub in pgp_subtags:
                    sub_text = sub.get_text(strip=True)
                    if "-----BEGIN PGP" in sub_text:
                        b = self._build_block(sub, sub_text, "pgp_information", full_cleaned_text, seq, dom_counter)
                        blocks.append(b)
                        seq += 1
                        dom_counter += 1

            block_type = self._classify_element(candidate, text)
            b = self._build_block(candidate, text, block_type, full_cleaned_text, seq, dom_counter)
            blocks.append(b)
            seq += 1
            dom_counter += 1

        # Fallback: if no semantic blocks were extracted, treat paragraphs or root as a block
        if not blocks and full_cleaned_text:
            block_hash = hashlib.sha256(full_cleaned_text.encode("utf-8")).hexdigest()
            blocks.append(
                ParsedBlock(
                    block_type="general_content",
                    text_content=full_cleaned_text[:4000],
                    xpath="/html/body",
                    css_selector="body",
                    dom_start=0,
                    dom_end=len(full_cleaned_text),
                    char_start=0,
                    char_end=min(len(full_cleaned_text), 4000),
                    block_hash=block_hash,
                    sequence_number=0
                )
            )

        return full_cleaned_text, blocks

    def _find_candidate_containers(self, root: Tag) -> List[Tag]:
        """Find meaningful container tags in the cleaned DOM tree"""
        semantic_tags = [
            "article", "section", "blockquote", "table", "pre", "tr", "dl", "fieldset"
        ]
        candidates = []

        # 1. Structural semantic HTML tags
        for t in root.find_all(semantic_tags):
            candidates.append(t)

        # 2. Divs/list items with semantic class names or IDs
        semantic_class_id = re.compile(
            r"post|message|comment|vendor|seller|product|item|profile|listing|review|feedback|contact|bio|details|user",
            re.IGNORECASE
        )
        for t in root.find_all(["div", "li", "main"]):
            classes = " ".join(t.get("class", []))
            tag_id = t.get("id", "")
            if semantic_class_id.search(classes) or semantic_class_id.search(tag_id):
                candidates.append(t)

        # 3. Headings with subsequent paragraphs
        for h in root.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
            candidates.append(h)

        # Deduplicate and sort by appearance in document
        seen = set()
        ordered = []
        for c in candidates:
            # Skip if this element's text is identical to a previously collected parent
            element_id = id(c)
            if element_id not in seen:
                seen.add(element_id)
                ordered.append(c)

        return ordered if ordered else root.find_all(["p", "div"])

    def _classify_element(self, element: Tag, text: str) -> str:
        """Classify a DOM element into a semantic block type"""
        classes = " ".join(element.get("class", [])).lower()
        tag_id = str(element.get("id", "")).lower()
        attr_text = f"{classes} {tag_id} {element.name}"

        # PGP
        if BLOCK_PATTERNS["pgp_information"].search(text):
            return "pgp_information"

        # Seller profile
        if BLOCK_PATTERNS["seller_profile"].search(attr_text) or ("vendor" in text.lower() and "rating" in text.lower()):
            return "seller_profile"

        # Product listing
        if BLOCK_PATTERNS["product_listing"].search(attr_text) or ("price" in text.lower() and "escrow" in text.lower()):
            return "product_listing"

        # Forum post
        if BLOCK_PATTERNS["forum_post"].search(attr_text) or ("replied" in text.lower() or "author" in text.lower()):
            return "forum_post"

        # Contact info
        if BLOCK_PATTERNS["contact_information"].search(attr_text) or BLOCK_PATTERNS["contact_information"].search(text):
            return "contact_information"

        if element.name in ["h1", "h2", "h3"]:
            return "thread_header"

        return "general_content"

    def _build_block(
        self,
        element: Tag,
        text: str,
        block_type: str,
        full_text: str,
        seq: int,
        dom_idx: int
    ) -> ParsedBlock:
        xpath = self._compute_xpath(element)
        css_selector = self._compute_css_selector(element)
        block_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

        # Find character offset in cleaned document text
        char_start = full_text.find(text[:60]) if len(text) >= 60 else full_text.find(text)
        if char_start < 0:
            char_start = 0
        char_end = char_start + len(text)

        published_at = self._extract_timestamp(element, text)

        return ParsedBlock(
            block_type=block_type,
            text_content=text,
            xpath=xpath,
            css_selector=css_selector,
            dom_start=dom_idx,
            dom_end=dom_idx + 1,
            char_start=char_start,
            char_end=char_end,
            block_hash=block_hash,
            sequence_number=seq,
            published_at=published_at
        )

    def _extract_timestamp(self, element: Tag, text: str) -> Optional[datetime]:
        """Extract authentic publication timestamp from element attributes or text"""
        # 1. <time> tag
        time_tag = element.find("time")
        if time_tag:
            dt_attr = time_tag.get("datetime")
            if dt_attr:
                dt = self._parse_date_str(str(dt_attr))
                if dt:
                    return dt
            dt = self._parse_date_str(time_tag.get_text(strip=True))
            if dt:
                return dt

        # 2. Semantic classes
        for cls in ["post-date", "date", "timestamp", "posted-at", "post-time"]:
            sub = element.find(class_=lambda c: c and cls in str(c).lower())
            if sub:
                dt = self._parse_date_str(sub.get_text(strip=True))
                if dt:
                    return dt

        # 3. Text regex matching
        match = re.search(r'\b(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?)\b', text)
        if match:
            dt = self._parse_date_str(match.group(1))
            if dt:
                return dt

        date_match = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', text)
        if date_match:
            dt = self._parse_date_str(date_match.group(1))
            if dt:
                return dt

        return None

    def _parse_date_str(self, val: str) -> Optional[datetime]:
        val = val.replace("Z", "").replace("UTC", "").replace("GMT", "").strip()
        for fmt in (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M",
            "%Y-%m-%d"
        ):
            try:
                return datetime.strptime(val, fmt)
            except (ValueError, TypeError):
                continue
        return None

    def _compute_xpath(self, element: Tag) -> str:
        """Compute an XPath for a BeautifulSoup element"""
        components = []
        child = element
        while child and child.name and child.name != "[document]":
            parent = child.parent
            if parent and parent.name != "[document]":
                siblings = [s for s in parent.children if isinstance(s, Tag) and s.name == child.name]
                if len(siblings) > 1:
                    index = siblings.index(child) + 1
                    components.append(f"{child.name}[{index}]")
                else:
                    components.append(child.name)
            else:
                components.append(child.name)
            child = parent
        components.reverse()
        return "/" + "/".join(components) if components else "/html/body"

    def _compute_css_selector(self, element: Tag) -> str:
        """Compute a representative CSS selector for an element"""
        components = []
        child = element
        while child and child.name and child.name not in ["[document]", "html"]:
            selector = child.name
            classes = child.get("class")
            if classes:
                selector += "." + ".".join(classes[:2])
            tag_id = child.get("id")
            if tag_id:
                selector = f"#{tag_id}"
                components.append(selector)
                break
            components.append(selector)
            child = child.parent
        components.reverse()
        return " > ".join(components) if components else "body"
