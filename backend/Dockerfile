FROM python:3.11-slim

# Sensible Python defaults for containers:
# - no .pyc files, unbuffered stdout so request logs stream in real time
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as an unprivileged user
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# Development server (docker-compose mounts ./backend for live reload).
# For production, swap for a WSGI server, e.g.:
#   CMD ["gunicorn", "collabdocs.wsgi:application", "--bind", "0.0.0.0:8000"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
