FROM mcr.microsoft.com/devcontainers/typescript-node:22

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install useful tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
