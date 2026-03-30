# BirdDex BirdNET Server

Local Python server that powers sound-based bird identification in BirdDex.

## Setup

```bash
cd server

# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies (birdnetlib downloads BirdNET model weights on first run, ~100MB)
pip install -r requirements.txt
```

## Start the server

```bash
python server.py
# Server runs at http://localhost:5001
# Check health at http://localhost:5001/health
```

## API

### POST /identify

Accepts a multipart form upload and returns species predictions.

**Form fields:**
- `audio` (file, required) — audio recording (webm, wav, mp3, ogg)
- `lat` (float, optional) — latitude, default 34.0195 (Santa Monica)
- `lng` (float, optional) — longitude, default -118.4912
- `week` (int, optional) — ISO week number for seasonal filtering, defaults to current week

**Response:**
```json
{
  "detections": [
    {
      "common_name": "Black Phoebe",
      "scientific_name": "Sayornis nigricans",
      "confidence": 87.3
    }
  ]
}
```

## Notes

- BirdNET works best with 3–10 second recordings of isolated bird calls
- Background noise (traffic, wind) reduces accuracy
- Location + week filtering significantly improves results for your region
- If `birdnetlib` is not installed, the server returns an empty detections array with an error message (the frontend handles this gracefully)
