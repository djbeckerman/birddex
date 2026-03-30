"""
BirdDex BirdNET Server
Accepts audio uploads and returns species predictions using BirdNET-Analyzer.
"""
import os
import tempfile
from datetime import date

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

try:
    from birdnetlib import Recording
    from birdnetlib.analyzer import Analyzer
    BIRDNET_AVAILABLE = True
except ImportError:
    BIRDNET_AVAILABLE = False
    print("WARNING: birdnetlib not installed. Install it with: pip install birdnetlib")

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
    return {"status": "ok", "birdnet_available": BIRDNET_AVAILABLE and analyzer is not None}


@app.post("/identify")
async def identify_birds(
    audio: UploadFile = File(...),
    lat: float = Form(34.0195),
    lng: float = Form(-118.4912),
    week: int = Form(None),
):
    if not BIRDNET_AVAILABLE or analyzer is None:
        return {"detections": [], "error": "BirdNET not available. Run: pip install birdnetlib"}

    if week is None:
        week = date.today().isocalendar()[1]

    # Write upload to a temp file
    suffix = os.path.splitext(audio.filename or "recording")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        recording = Recording(
            analyzer,
            tmp_path,
            lat=lat,
            lon=lng,
            week=week,
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
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
