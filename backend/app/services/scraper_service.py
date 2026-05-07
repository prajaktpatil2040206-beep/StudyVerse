import os
import re
import time
import base64
import urllib.parse
from datetime import datetime
from typing import Optional, List, Dict, Any
from io import BytesIO

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage,
    Table, TableStyle, HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text or "")
    return text.strip()

def safe_get(url: str, timeout: int = 15) -> Optional[requests.Response]:
    try:
        resp = SESSION.get(url, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        return resp
    except Exception:
        return None

def fetch_image_b64(url: str) -> Optional[str]:
    try:
        r = SESSION.get(url, timeout=10, stream=True)
        r.raise_for_status()
        ct = r.headers.get("Content-Type", "")
        if "image" not in ct:
            return None
        data = r.content
        if len(data) < 2000:          # skip tiny icons
            return None
        return base64.b64encode(data).decode()
    except Exception:
        return None

def domain_name(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return url

def scrape_page(url: str) -> dict:
    result = {
        "url": url,
        "domain": domain_name(url),
        "title": "",
        "description": "",
        "keywords": "",
        "author": "",
        "published_date": "",
        "paragraphs": [],
        "headings": [],
        "images": [],
        "links": [],
        "word_count": 0,
        "scraped_at": datetime.now().isoformat(),
        "status": "success",
        "error": ""
    }

    resp = safe_get(url)
    if resp is None:
        result["status"] = "error"
        result["error"] = "Failed to fetch URL"
        return result

    soup = BeautifulSoup(resp.text, "html.parser")

    result["title"] = clean_text(soup.title.string) if soup.title else ""

    for tag in soup.find_all("meta"):
        name = (tag.get("name") or tag.get("property") or "").lower()
        content = tag.get("content", "")
        if not content:
            continue
        if name in ("description", "og:description", "twitter:description"):
            if not result["description"]:
                result["description"] = clean_text(content)
        elif name in ("keywords",):
            result["keywords"] = clean_text(content)
        elif name in ("author", "article:author"):
            if not result["author"]:
                result["author"] = clean_text(content)
        elif name in ("article:published_time", "pubdate", "date"):
            if not result["published_date"]:
                result["published_date"] = clean_text(content)

    for tag in soup.find_all(["h1", "h2", "h3"]):
        txt = clean_text(tag.get_text())
        if txt and len(txt) > 3:
            result["headings"].append({"level": tag.name, "text": txt})

    for p in soup.find_all("p"):
        txt = clean_text(p.get_text())
        if len(txt) > 60:
            result["paragraphs"].append(txt)

    result["word_count"] = sum(len(p.split()) for p in result["paragraphs"])

    seen_imgs = set()
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or ""
        if not src:
            continue
        abs_src = urljoin(url, src)
        if abs_src in seen_imgs:
            continue
        seen_imgs.add(abs_src)
        alt = clean_text(img.get("alt", ""))
        result["images"].append({
            "src": abs_src,
            "alt": alt,
            "b64": None
        })
        if len(result["images"]) >= 12:
            break

    for img_obj in result["images"][:6]:
        b64 = fetch_image_b64(img_obj["src"])
        if b64:
            img_obj["b64"] = b64

    seen_links = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(url, a["href"])
        if href.startswith("http") and href not in seen_links and href != url:
            seen_links.add(href)
            txt = clean_text(a.get_text())
            result["links"].append({"url": href, "text": txt[:120]})
        if len(result["links"]) >= 30:
            break

    return result

def search_and_scrape(query: str, max_sites: int = 6) -> list:
    search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(query)}"
    resp = safe_get(search_url)
    if resp is None:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    urls = []

    for a in soup.select("a.result__url, .result__a"):
        href = a.get("href", "")
        if "uddg=" in href:
            try:
                href = urllib.parse.unquote(re.search(r'uddg=([^&]+)', href).group(1))
            except Exception:
                pass
        if href.startswith("http") and href not in urls:
            urls.append(href)
        if len(urls) >= max_sites:
            break

    if not urls:
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("http") and "duckduckgo" not in href and href not in urls:
                urls.append(href)
            if len(urls) >= max_sites:
                break

    results = []
    for url in urls[:max_sites]:
        data = scrape_page(url)
        results.append(data)
        time.sleep(0.4)

    return results

BRAND_BG     = colors.HexColor("#E0E5EC")
BRAND_DARK   = colors.HexColor("#3D4852")
BRAND_MID    = colors.HexColor("#F5F7FA")
BRAND_ACCENT = colors.HexColor("#6C63FF")
BRAND_MUTED  = colors.HexColor("#6B7280")
BRAND_CARD   = colors.HexColor("#FFFFFF")
WHITE        = colors.white

def add_page_decorations(canvas_obj, doc):
    canvas_obj.saveState()
    w, h = A4
    canvas_obj.setFillColor(BRAND_BG)
    canvas_obj.rect(0, 0, w, h, fill=1, stroke=0)
    canvas_obj.setFillColor(BRAND_ACCENT)
    canvas_obj.setFillAlpha(0.3)
    canvas_obj.rect(0, h - 4, w, 4, fill=1, stroke=0)
    canvas_obj.setFillAlpha(1)
    canvas_obj.setFillColor(BRAND_MID)
    canvas_obj.rect(0, 0, w, 30, fill=1, stroke=0)
    canvas_obj.setFillColor(BRAND_MUTED)
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.drawString(inch * 0.7, 10, f"StudyVerse Research Report  •  Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    canvas_obj.drawRightString(w - inch * 0.7, 10, f"Page {doc.page}")
    canvas_obj.setFillColor(BRAND_ACCENT)
    canvas_obj.setFillAlpha(0.1)
    canvas_obj.rect(0, 30, 3, h - 34, fill=1, stroke=0)
    canvas_obj.setFillAlpha(1)
    canvas_obj.restoreState()

def generate_pdf_report(scraped_data: list, query: str) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.5 * inch,
        onFirstPage=add_page_decorations,
        onLaterPages=add_page_decorations,
    )

    styles = getSampleStyleSheet()
    def S(name, **kw): return ParagraphStyle(name, **kw)

    sTitle = S("ReportTitle", fontSize=28, textColor=BRAND_ACCENT, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=4)
    sSub = S("ReportSub", fontSize=12, textColor=BRAND_MUTED, fontName="Helvetica", alignment=TA_CENTER, spaceAfter=20)
    sSectionHead = S("SectionHead", fontSize=15, textColor=BRAND_ACCENT, fontName="Helvetica-Bold", spaceBefore=16, spaceAfter=6, borderPadding=(0, 0, 4, 0))
    sCardHead = S("CardHead", fontSize=12, textColor=BRAND_DARK, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)
    sBody = S("Body", fontSize=9, textColor=BRAND_DARK, fontName="Helvetica", leading=15, spaceAfter=6)
    sMeta = S("Meta", fontSize=8, textColor=BRAND_MUTED, fontName="Helvetica-Oblique", spaceAfter=4)
    sSmall = S("Small", fontSize=7.5, textColor=BRAND_MUTED, fontName="Helvetica", spaceAfter=2)
    sUrl = S("Url", fontSize=7.5, textColor=BRAND_ACCENT, fontName="Helvetica", spaceAfter=2)

    story = []
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph("📚 StudyVerse Research Report", sTitle))
    story.append(Paragraph("Reference Materials & Study Notes", sSub))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_ACCENT, spaceAfter=10))

    now = datetime.now()
    cover_data = [
        ["Query / URL", query],
        ["Generated", now.strftime("%A, %B %d, %Y  %H:%M:%S")],
        ["Sources Scraped", str(len(scraped_data))],
        ["Total Images Found", str(sum(len(d.get("images", [])) for d in scraped_data))],
        ["Total Words Extracted", f"{sum(d.get('word_count', 0) for d in scraped_data):,}"],
    ]
    t = Table(cover_data, colWidths=[2.2 * inch, 4.5 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), BRAND_MID),
        ("BACKGROUND", (1, 0), (1, -1), BRAND_CARD),
        ("TEXTCOLOR", (0, 0), (-1, -1), BRAND_DARK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [BRAND_CARD, BRAND_MID]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.3 * inch))

    story.append(Paragraph("📡 Sources Summary", sSectionHead))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_MID, spaceAfter=8))

    src_data = [["#", "Domain", "Title", "Words", "Images", "Status"]]
    for i, d in enumerate(scraped_data, 1):
        src_data.append([
            str(i),
            d.get("domain", "")[:28],
            (d.get("title", "") or "—")[:45],
            f"{d.get('word_count', 0):,}",
            str(len(d.get("images", []))),
            "✓ OK" if d.get("status") == "success" else "✗ ERR",
        ])

    t2 = Table(src_data, colWidths=[0.3*inch, 1.5*inch, 2.8*inch, 0.6*inch, 0.6*inch, 0.6*inch])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BRAND_CARD, BRAND_MID]),
        ("TEXTCOLOR", (0, 1), (-1, -1), BRAND_DARK),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D5DD")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (3, 0), (-1, -1), "CENTER"),
    ]))
    story.append(t2)
    story.append(Spacer(1, 0.2 * inch))

    for idx, site in enumerate(scraped_data, 1):
        story.append(PageBreak())
        story.append(Paragraph(f"SOURCE {idx}  ·  {site.get('domain', '')}", sSectionHead))
        story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_ACCENT, spaceAfter=6))

        meta_rows = []
        if site.get("title"): meta_rows.append(["Title", site["title"][:90]])
        if site.get("url"): meta_rows.append(["URL", site["url"][:90]])
        if site.get("author"): meta_rows.append(["Author", site["author"][:60]])
        if site.get("published_date"): meta_rows.append(["Published", site["published_date"][:40]])
        if site.get("description"): meta_rows.append(["Description", site["description"][:120]])

        if meta_rows:
            mt = Table(meta_rows, colWidths=[1.2*inch, 5.5*inch])
            mt.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), BRAND_MID),
                ("BACKGROUND", (1, 0), (1, -1), BRAND_CARD),
                ("TEXTCOLOR", (0, 0), (0, -1), BRAND_ACCENT),
                ("TEXTCOLOR", (1, 0), (1, -1), BRAND_DARK),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D5DD")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 7),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [BRAND_CARD, BRAND_MID]),
            ]))
            story.append(mt)
            story.append(Spacer(1, 0.15 * inch))

        if site.get("headings"):
            story.append(Paragraph("📝 Article Structure", sCardHead))
            for h in site["headings"][:10]:
                indent = 0 if h["level"] == "h1" else (0.2*inch if h["level"] == "h2" else 0.4*inch)
                p_style = S(f"H_{idx}_{h['level']}",
                    fontSize=10 if h["level"]=="h1" else (9 if h["level"]=="h2" else 8),
                    textColor=BRAND_DARK if h["level"]=="h1" else (BRAND_ACCENT if h["level"]=="h2" else BRAND_MUTED),
                    fontName="Helvetica-Bold", leftIndent=indent, spaceAfter=2)
                story.append(Paragraph(f"{'▸ ' if h['level']!='h1' else ''}{h['text'][:80]}", p_style))
            story.append(Spacer(1, 0.1 * inch))

        if site.get("paragraphs"):
            story.append(Paragraph("📄 Article Content", sCardHead))
            for para in site["paragraphs"][:8]:
                story.append(Paragraph(para[:600], sBody))
            story.append(Spacer(1, 0.1 * inch))

        valid_imgs = [img for img in site.get("images", []) if img.get("b64")]
        if valid_imgs:
            story.append(Paragraph(f"🖼 Images Found ({len(site['images'])} total, showing {len(valid_imgs)})", sCardHead))
            img_table_data = []
            row = []
            for i, img_obj in enumerate(valid_imgs[:6]):
                try:
                    raw = base64.b64decode(img_obj["b64"])
                    bio = BytesIO(raw)
                    ri = RLImage(bio, width=1.8*inch, height=1.3*inch, kind="proportional")
                    alt_p = Paragraph(img_obj.get("alt", "")[:40] or "Image", sSmall)
                    row.append([ri, alt_p])
                except Exception:
                    row.append([Paragraph("(image)", sSmall), Paragraph("", sSmall)])
                if len(row) == 3:
                    img_table_data.append(row)
                    row = []
            if row:
                while len(row) < 3: row.append(["", ""])
                img_table_data.append(row)

            flat = []
            for r in img_table_data:
                flat.append([cell[0] if cell else "" for cell in r])
                flat.append([cell[1] if cell else "" for cell in r])

            if flat:
                it = Table(flat, colWidths=[2.2*inch, 2.2*inch, 2.2*inch])
                it.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), BRAND_CARD),
                    ("GRID", (0, 0), (-1, -1), 0.5, BRAND_MID),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]))
                story.append(it)
            story.append(Spacer(1, 0.1 * inch))

    story.append(PageBreak())
    story.append(Paragraph("📊 Report Summary", sSectionHead))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_ACCENT, spaceAfter=10))

    st = Table([
        ["Metric", "Value"],
        ["Total Sources Scraped", str(len(scraped_data))],
        ["Successful Scrapes", str(sum(1 for d in scraped_data if d.get("status") == "success"))],
        ["Total Words Extracted", f"{sum(d.get('word_count', 0) for d in scraped_data):,}"],
        ["Total Images Found", str(sum(len(d.get("images", [])) for d in scraped_data))],
        ["Report Generated", now.strftime("%Y-%m-%d %H:%M:%S")],
    ], colWidths=[3*inch, 3.7*inch])
    st.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BRAND_CARD, BRAND_MID]),
        ("TEXTCOLOR", (0, 1), (-1, -1), BRAND_DARK),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D0D5DD")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(st)
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph("Generated by StudyVerse  •  Your AI-Powered Study Companion", sMeta))

    doc.build(story)
    buffer.seek(0)
    return buffer
