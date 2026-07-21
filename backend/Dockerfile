FROM python:3.12-slim

WORKDIR /app

# python-dotenv is a no-op in prod (env comes from the platform), pillow only
# feeds the local test-screenshot script - both are small, keep the image simple.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# $PORT is injected by Render/Fly/Railway; default keeps local docker runs working.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
