FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY . .

# Set default port
ENV PORT=8000
EXPOSE 8000

# Run FastAPI app with Uvicorn
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
