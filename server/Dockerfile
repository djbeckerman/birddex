FROM python:3.10-slim

# ffmpeg: required by librosa to decode .webm audio from browsers
# libgomp1: required by tflite-runtime's native OpenMP extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libgomp1 \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

# Railway injects $PORT at runtime
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-5001}"]
