# ------------------------------------------------------------------------------
# PDFium Stage
# ------------------------------------------------------------------------------

FROM debian:bookworm-slim AS pdfium

# Update and install curl and tar
RUN --mount=type=cache,target=/var/cache/apt --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y curl tar

# Download and extract the PDFium binaries
RUN set -ex; \
    mkdir -p pdfium; \
    if [ $(arch) = "x86_64" ]; then \
        # NOTE: This was previously -x86, need to test more on amd64-compatible systems to ensure I have the right one
        curl -sLo pdfium.tgz https://github.com/bblanchon/pdfium-binaries/releases/download/chromium/6707/pdfium-linux-x64.tgz; \
    elif [ $(arch) = "aarch64" ]; then \
        curl -sLo pdfium.tgz https://github.com/bblanchon/pdfium-binaries/releases/download/chromium/6707/pdfium-linux-arm64.tgz; \
    fi; \
    tar -xzvf pdfium.tgz -C ./pdfium; \
    rm pdfium.tgz

# We need to validate the sha of the libpdfium.so file:
# amd64 -> e45484bfde8165f566633bc863564fdbd964bd87
# arm64 -> 6519048a851f97ec86c498d827cf31efe453287b
RUN set -ex; \
    if [ $(arch) = "x86_64" ]; then \
        echo "e45484bfde8165f566633bc863564fdbd964bd87 /pdfium/lib/libpdfium.so" | sha1sum -c -; \
    elif [ $(arch) = "aarch64" ]; then \
        echo "6519048a851f97ec86c498d827cf31efe453287b /pdfium/lib/libpdfium.so" | sha1sum -c -; \
    else \
        echo "Unsupported architecture"; \
        exit 1; \
    fi

# ------------------------------------------------------------------------------
# Frontend Build Stage
# ------------------------------------------------------------------------------

FROM node:20.9.0-alpine3.18 AS frontend
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

FROM rust:1.85-bookworm AS builder

ARG GIT_REV
ARG TARGETARCH

ENV GIT_REV=${GIT_REV}

RUN --mount=type=cache,target=/var/cache/apt --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y \
        build-essential \
        cmake \
        wget \
        git \
        libssl-dev \
        pkg-config \
        curl \
        libsqlite3-dev;

# Cargo build for stump
WORKDIR /app

COPY . .


RUN --mount=type=cache,target=/usr/local/cargo/registry,id=${TARGETARCH} \
    --mount=type=cache,target=/app/target,id=${TARGETARCH} \
    ./docker/build_server.sh && \
    cp ./target/release/stump_server ./stump_server

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------

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
