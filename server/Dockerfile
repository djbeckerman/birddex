FROM python:3.11-slim

# Install ffmpeg — required by librosa to decode .webm audio from browsers
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

# Railway injects $PORT at runtime
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-5001}"]
