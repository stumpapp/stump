# ------------------------------------------------------------------------------
# Frontend Build Stage
# ------------------------------------------------------------------------------

FROM node:20.0.0-alpine3.16 AS frontend
ARG TARGETARCH

WORKDIR /app

COPY . .

RUN --mount=type=cache,target=/usr/local/yarn/.cache,id=${TARGETARCH} \ 
    # https://github.com/nodejs/docker-node/issues/1335
    yarn config set network-timeout 300000 && \
        YARN_CACHE_FOLDER=/usr/local/yarn/.cache yarn install --frozen-lockfile && \
        yarn web build && \
        mv ./apps/web/dist/ ./build && \
        if [ ! -d "./build" ] || [ ! "$(ls -A ./build)" ]; then exit 1; fi


# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

FROM rust:1.79.0-slim-buster AS builder

ARG GIT_REV
ARG TAGS
ARG TARGETARCH
ARG RUN_PRISMA_GENERATE

ENV GIT_REV=${GIT_REV}
ENV TAGS=${TAGS}
ENV RUN_PRISMA_GENERATE=${RUN_PRISMA_GENERATE}

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    wget \
    git \
    libssl-dev \
    pkg-config \
    libsqlite3-dev;

RUN wget -qO- https://sh.rustup.rs | sh -s -- -yq --profile minimal

ENV PATH="/usr/local/cargo/bin:$PATH"

# From: https://github.com/rust-lang/rust-analyzer/blob/master/.github/workflows/release.yaml#L13-L21
ENV CARGO_NET_RETRY=10
ENV CARGO_INCREMENTAL=0
ENV RUSTUP_MAX_RETRIES=10

# Cargo build for stump
WORKDIR /app

COPY . .

RUN --mount=type=cache,target=/usr/local/cargo,id=${TARGETARCH},source=/usr/local/cargo \
    --mount=type=cache,target=/app/target,id=${TARGETARCH} \
    # RUN_PRISMA_GENERATE=${RUN_PRISMA_GENERATE} ./docker/build_server.sh && \
    set -ex; \
    ./scripts/release/utils.sh -w; \
    ./scripts/release/utils.sh -p; \
    cargo build --package stump_server --bin stump_server --release
    cp ./target/release/stump_server ./stump_server
# RUN RUN_PRISMA_GENERATE=${RUN_PRISMA_GENERATE} ./docker/build_server.sh && \
#     cp ./target/release/stump_server ./stump_server

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
        curl -sLo pdfium.tgz https://github.com/bblanchon/pdfium-binaries/releases/download/chromium/6406/pdfium-linux-x64.tgz; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        curl -sLo pdfium.tgz https://github.com/bblanchon/pdfium-binaries/releases/download/chromium/6406/pdfium-linux-arm64.tgz; \
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
    ln -s /opt/pdfium/lib/libpdfium.so /lib/libpdfium.so; \
    echo "/usr/local/lib" >> /etc/ld.so.conf.d/mylibs.conf \
    && ldconfig; \
    if [ ! -d "/app/client" ] || [ ! "$(ls -A /app/client)" ]; then exit 1; fi

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
