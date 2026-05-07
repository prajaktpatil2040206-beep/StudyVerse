import re
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.scraper_service import scrape_page, search_and_scrape, generate_pdf_report

router = APIRouter()

class ScrapeRequest(BaseModel):
    input: str

@router.post("/scrape")
async def api_scrape(req: ScrapeRequest):
    input_val = req.input.strip()
    if not input_val:
        raise HTTPException(status_code=400, detail="No input provided")

    if input_val.startswith("http://") or input_val.startswith("https://"):
        data = [scrape_page(input_val)]
    else:
        data = search_and_scrape(input_val, max_sites=6)

    if not data:
        raise HTTPException(status_code=404, detail="No results found")

    # Strip b64 from JSON response (only used for PDF)
    json_data = []
    for d in data:
        d2 = dict(d)
        d2["images"] = [
            {k: v for k, v in img.items() if k != "b64"}
            for img in d2.get("images", [])
        ]
        json_data.append(d2)

    return {"results": json_data, "count": len(json_data)}

@router.post("/report")
async def api_report(req: ScrapeRequest):
    input_val = req.input.strip()
    if not input_val:
        raise HTTPException(status_code=400, detail="No input provided")

    if input_val.startswith("http://") or input_val.startswith("https://"):
        data = [scrape_page(input_val)]
    else:
        data = search_and_scrape(input_val, max_sites=6)

    if not data:
        raise HTTPException(status_code=404, detail="No data to generate report")

    pdf_buf = generate_pdf_report(data, input_val)
    safe_q = re.sub(r'[^a-zA-Z0-9_-]', '_', input_val[:30])
    filename = f"studyverse_research_{safe_q}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

    return StreamingResponse(
        pdf_buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
