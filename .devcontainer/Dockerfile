FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv python3-pip ffmpeg ripgrep jq unzip zip \
    poppler-utils tesseract-ocr libreoffice pandoc cmake build-essential \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g bun @openai/codex @anthropic-ai/claude-code \
    vercel@62.7.0 eas-cli expo-doctor @expo/ngrok @devcontainers/cli
USER node
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
RUN curl -fsSL https://cli.devin.ai/install.sh | bash
ENV PATH="/home/node/.local/bin:${PATH}"
