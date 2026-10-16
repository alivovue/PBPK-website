# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS node

FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/model-cache \
    HF_HUB_DISABLE_PROGRESS_BARS=1 \
    AI_NODE_BINARY=/usr/local/bin/node \
    AI_PYTHON_BINARY=/usr/local/bin/python

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libstdc++6 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# The supplied chatbot uses Node's built-in modules; npm packages are unnecessary.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /app

COPY requirements.txt requirements-ai.txt ./
COPY chatbot/requirements-indobert.txt ./chatbot/requirements-indobert.txt
# Install the CPU build first so the AI requirements do not pull CUDA packages.
RUN python -m pip install 'torch==2.10.0' --index-url https://download.pytorch.org/whl/cpu \
    && python -m pip install -r requirements-ai.txt

COPY app ./app
COPY database ./database
COPY chatbot ./chatbot
COPY docker_entrypoint.py ./docker_entrypoint.py
RUN mkdir -p /app/database/data /app/model-cache /app/runtime

EXPOSE 8000
ENTRYPOINT ["python", "/app/docker_entrypoint.py"]
# Multiplayer rooms and the managed AI workers require one API worker.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
