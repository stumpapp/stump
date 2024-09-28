# ------------------------------------------------------------------------------
# Frontend Build Stage
# ------------------------------------------------------------------------------

FROM node:20.0.0-alpine3.16 AS frontend
ARG TARGETARCH

WORKDIR /app

COPY . .

# We need to install git for yarn to work (we have git dependencies)
RUN apk add --no-cache git

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

FROM rust:1.81.0-slim-buster AS builder

ARG GIT_REV
ARG TARGETARCH
ARG RUN_PRISMA_GENERATE

ENV GIT_REV=${GIT_REV}
ENV RUN_PRISMA_GENERATE=${RUN_PRISMA_GENERATE}

RUN --mount=type=cache,target=/var/cache/apt --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y \
        build-essential \
        cmake \
        wget \
        git \
        libssl-dev \
        pkg-config \
        # See https://github.com/juhaku/utoipa/issues/958#issuecomment-2165300584
        curl \
        libsqlite3-dev;

# Cargo build for stump
WORKDIR /app

COPY . .


RUN --mount=type=cache,target=/usr/local/cargo/registry,id=${TARGETARCH} \
    --mount=type=cache,target=/app/target,id=${TARGETARCH} \
    RUN_PRISMA_GENERATE=${RUN_PRISMA_GENERATE} ./docker/build_server.sh && \
    cp ./target/release/stump_server ./stump_server

# ------------------------------------------------------------------------------
# PDFium Stage
# ------------------------------------------------------------------------------

FROM debian:buster-slim AS pdfium
ARG TARGETARCH

RUN --mount=type=cache,target=/var/cache/apt --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y curl tar; \
        # Download and extract PDFium
        set -ex; \
        mkdir -p pdfium; \
        if [ "$TARGETARCH" = "amd64" ]; then \
            # NOTE: This was previously -x86, need to test more on amd64-compatible systems to ensure I have the right one
            curl -sLo pdfium.tgz https://github.com/bblanchon/pdfium-binaries/releases/download/chromium/6707/pdfium-linux-x64.tgz; \
        elif [ "$TARGETARCH" = "arm64" ]; then \
            curl -sLo pdfium.tgz https://github.com/bblanchon/pdfium-binaries/releases/download/chromium/6707/pdfium-linux-arm64.tgz; \
        fi; \
        tar -xzvf pdfium.tgz -C ./pdfium; \
        rm pdfium.tgz

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------

# FROM debian:buster-slim
FROM gcr.io/distroless/cc-debian12:debug

RUN [ "/busybox/ln", "-s", "/busybox/sh", "/bin/sh" ]
RUN ln -s /busybox/env /usr/bin/env

# TODO(distroless): Ensure locales aren't messed up
# RUN apt-get update && apt-get install -y locales-all && rm -rf /var/lib/apt/lists/*; \
#     mkdir -p config && mkdir -p data && mkdir -p app

COPY --from=builder /app/stump_server /app/stump
COPY --from=pdfium /pdfium /opt/pdfium
COPY --from=frontend /app/build /app/client
COPY --chmod=755 docker/entrypoint.sh /entrypoint.sh

# Default Stump environment variables
ENV STUMP_CONFIG_DIR=/config \
    STUMP_CLIENT_DIR=/app/client \
    STUMP_PROFILE=release \
    STUMP_PORT=10801 \
    STUMP_IN_DOCKER=true \
    PDFIUM_PATH=/opt/pdfium/lib/libpdfium.so \
    API_VERSION=v1

WORKDIR /app

ENTRYPOINT ["/entrypoint.sh"]
