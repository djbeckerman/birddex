"""
BirdDex BirdNET Server
Accepts audio uploads and returns species predictions using BirdNET-Analyzer.
"""
import base64
import io
import os
import re
import tempfile
from datetime import date, datetime

import httpx
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

try:
    from PIL import Image
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIC_SUPPORT = True
except Exception as e:
    HEIC_SUPPORT = False
    print(f"WARNING: HEIC support unavailable: {e}")

try:
    from birdnetlib import Recording
    from birdnetlib.analyzer import Analyzer
    BIRDNET_AVAILABLE = True
except Exception as e:
    BIRDNET_AVAILABLE = False
    import traceback
    print(f"WARNING: birdnetlib import failed: {e}")
    traceback.print_exc()

app = FastAPI(title="BirdDex BirdNET Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Load the analyzer once at startup (heavy operation)
analyzer = None
if BIRDNET_AVAILABLE:
    try:
        analyzer = Analyzer()
        print("BirdNET analyzer loaded successfully.")
    except Exception as e:
        print(f"Failed to load analyzer: {e}")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "birdnet_available": BIRDNET_AVAILABLE and analyzer is not None,
        "photo_id_available": bool(os.environ.get("ANTHROPIC_API_KEY")),
    }


ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = "claude-sonnet-5"
_SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def _build_photo_prompt(month: str, location_str: str) -> str:
    return (
        "You are an expert birder. Identify the bird species in this photo.\n"
        f"The photo was taken in {month} near {location_str} in the Santa Monica / LA Coast region of California.\n\n"
        "Return ONLY valid JSON in this exact format, no other text:\n"
        '{"matches":[{"commonName":"...","scientificName":"...","confidence":85,"funFact":"One interesting sentence."}]}\n\n'
        "Rules:\n"
        "- Up to 5 matches, sorted by confidence descending\n"
        "- confidence is an integer 0–100\n"
        f"- Only include species plausible for coastal Southern California in {month}\n"
        "- funFact is exactly one concise sentence about the species\n"
        '- If no bird is clearly visible: {"matches":[],"reason":"brief explanation"}'
    )


@app.post("/identify-photo")
async def identify_photo(
    image: UploadFile = File(...),
    lat: float | None = Form(None),
    lng: float | None = Form(None),
):
    if not ANTHROPIC_API_KEY:
        return {"matches": [], "error": "Photo identification is not configured on the server (missing ANTHROPIC_API_KEY)."}

    image_bytes = await image.read()
    filename = (image.filename or "").lower()
    is_heic = (image.content_type in ("image/heic", "image/heif")) or filename.endswith((".heic", ".heif"))

    if is_heic:
        if not HEIC_SUPPORT:
            return {"matches": [], "error": "HEIC photos aren't supported right now — try a JPEG or PNG instead."}
        try:
            with Image.open(io.BytesIO(image_bytes)) as im:
                im = im.convert("RGB")
                buf = io.BytesIO()
                im.save(buf, format="JPEG", quality=90)
                image_bytes = buf.getvalue()
            media_type = "image/jpeg"
        except Exception:
            return {"matches": [], "error": "Could not read that photo — try a JPEG or PNG instead."}
    else:
        media_type = image.content_type if image.content_type in _SUPPORTED_IMAGE_TYPES else "image/jpeg"

    b64_data = base64.b64encode(image_bytes).decode("ascii")

    month = datetime.now().strftime("%B")
    if lat is not None and lng is not None:
        lat_dir = "N" if lat >= 0 else "S"
        lng_dir = "E" if lng >= 0 else "W"
        location_str = f"{abs(lat):.3f}°{lat_dir}, {abs(lng):.3f}°{lng_dir}"
    else:
        location_str = "Santa Monica, California"

    prompt = _build_photo_prompt(month, location_str)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": 1024,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64_data}},
                                {"type": "text", "text": prompt},
                            ],
                        }
                    ],
                },
            )
    except httpx.HTTPError as e:
        return {"matches": [], "error": f"Could not reach the field guide service: {e}"}

    if resp.status_code != 200:
        try:
            err_body = resp.json()
            message = err_body.get("error", {}).get("message", f"API error {resp.status_code}")
        except Exception:
            message = f"API error {resp.status_code}"
        return {"matches": [], "error": message}

    data = resp.json()
    text = (data.get("content") or [{}])[0].get("text", "")
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return {"matches": [], "error": "Could not parse response from field guide."}

    import json
    try:
        parsed = json.loads(match.group(0))
    except Exception:
        return {"matches": [], "error": "Could not parse response from field guide."}

    return {"matches": parsed.get("matches", [])}


@app.post("/identify")
async def identify_birds(
    audio: UploadFile = File(...),
    lat: float = Form(34.0195),
    lng: float = Form(-118.4912),
):
    if not BIRDNET_AVAILABLE or analyzer is None:
        return {"detections": [], "error": "BirdNET not available"}

    # Write upload to a temp file
    suffix = os.path.splitext(audio.filename or "recording")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        recording = Recording(
            analyzer,
            tmp_path,
            date=datetime.now(),  # birdnetlib converts to week_48 internally
            lat=lat,
            lon=lng,
            sensitivity=1.0,
            overlap=0.0,
        )
        recording.analyze()

        # Deduplicate and sort by confidence
        seen = set()
        results = []
        for d in recording.detections:
            sci = d.get("scientific_name", "")
            if sci not in seen:
                seen.add(sci)
                results.append({
                    "common_name": d.get("common_name", "Unknown"),
                    "scientific_name": sci,
                    "confidence": round(d.get("confidence", 0) * 100, 1),
                })

        results.sort(key=lambda x: x["confidence"], reverse=True)
        return {"detections": results[:5]}

    except Exception as e:
        return {"detections": [], "error": str(e)}

    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
