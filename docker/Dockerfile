# ------------------------------------------------------------------------------
# Frontend Build Stage
# ------------------------------------------------------------------------------

FROM node:16-alpine3.14 as frontend
ARG TARGETARCH

WORKDIR /app

# Note: I don't like copying ~everything~ but since I now use types exported from
# the core, and use pnpm specific means of accessing it via the workspace, I kind
# of need to maintain the structure of the workspace and use pnpm
COPY . .

RUN npm install -g pnpm; \
    pnpm i; \
    pnpm web build; \
    mv ./apps/web/dist build

# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

FROM rust:1.72.1-slim-buster AS builder

ARG GIT_REV
ENV GIT_REV=${GIT_REV}

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    pkg-config \
    libsqlite3-dev;

COPY . .

RUN ./scripts/release/utils.sh -w; \
    set -ex; \
    ./scripts/release/utils.sh -p; \
    cargo build --package stump_server --bin stump_server --release; \
    cp ./target/release/stump_server ./stump_server

# ------------------------------------------------------------------------------
# PDFium Stage
# ------------------------------------------------------------------------------

FROM debian:buster-slim AS pdfium
ARG TARGETARCH

RUN apt-get update && apt-get install -y curl tar; \
    # Download and extract PDFium
    set -ex; \
    mkdir -p pdfium; \
    if [ "$TARGETARCH" = "amd64" ]; then \
        # NOTE: This was previously -x86, need to test more on amd64-compatible systems to ensure I have the right one
        curl -sLo pdfium.tgz https://github.com/bblanchon/pdfium-binaries/releases/download/chromium/6002/pdfium-linux-x64.tgz; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        curl -sLo pdfium.tgz https://github.com/bblanchon/pdfium-binaries/releases/download/chromium/6002/pdfium-linux-arm64.tgz; \
    fi; \
    tar -xzvf pdfium.tgz -C ./pdfium; \
    rm pdfium.tgz

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------

FROM debian:buster-slim

RUN apt-get update && apt-get install -y locales-all && rm -rf /var/lib/apt/lists/*; \
    mkdir -p config && mkdir -p data && mkdir -p app

COPY --from=builder /app/stump_server /app/stump
COPY --from=pdfium /pdfium /opt/pdfium
COPY --from=frontend /app/build /app/client
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh; \
    ln -s /opt/pdfium/lib/libpdfium.so /lib/libpdfium.so

# Default Stump environment variables
ENV STUMP_CONFIG_DIR=/config \
    STUMP_CLIENT_DIR=/app/client \
    STUMP_PROFILE=release \
    STUMP_PORT=10801 \
    STUMP_IN_DOCKER=true \
    PDFIUM_PATH=/lib/libpdfium.so \
    API_VERSION=v1

WORKDIR /app

ENTRYPOINT ["/entrypoint.sh"]