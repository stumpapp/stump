# ------------------------------------------------------------------------------
# Frontend Build Stage
# ------------------------------------------------------------------------------

FROM node:20.0.0-alpine3.16 AS frontend
ARG TARGETARCH

WORKDIR /app

COPY . .

# https://github.com/nodejs/docker-node/issues/1335
RUN yarn config set network-timeout 300000 && \
    yarn install --frozen-lockfile && \
    yarn web build && \
    mv ./apps/web/dist/ ./build && \
    if [ ! -d "./build" ] || [ ! "$(ls -A ./build)" ]; then exit 1; fi


# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

FROM rust:1.79.0-slim-buster AS builder

# ARG TARGETARCH
ARG GIT_REV

ENV GIT_REV=${GIT_REV}

ARG TAGS
ENV TAGS=${TAGS}

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    pkg-config \
    meson \
    ninja-build \
    nasm \
    libsqlite3-dev;

# Building dav1d for AVIF Support
RUN git clone https://github.com/stumpapp/dav1d.git

WORKDIR /dav1d

RUN mkdir build 

WORKDIR /dav1d/build

RUN meson setup ../; \ 
    ninja; \
    ninja install

# Cargo build for stump
WORKDIR /app

COPY . .

RUN cargo prisma generate --schema ./core/prisma/schema.prisma; \
    ./scripts/release/utils.sh -w; \
    set -ex; \
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
        curl -sLo pdfium.tgz https://github.com/bblanchon/pdfium-binaries/releases/download/chromium/6406/pdfium-linux-x64.tgz; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        curl -sLo pdfium.tgz https://github.com/bblanchon/pdfium-binaries/releases/download/chromium/6406/pdfium-linux-arm64.tgz; \
    fi; \
    tar -xzvf pdfium.tgz -C ./pdfium; \
    rm pdfium.tgz

# ------------------------------------------------------------------------------
# dav1d Copy Stage
# ------------------------------------------------------------------------------

FROM debian:buster-slim AS dav1d
ARG TARGETARCH

COPY --from=builder /usr/local/lib /usr/local/lib

RUN set -ex; \
    if [ "$TARGETARCH" = "amd64" ]; then \
        cp -r /usr/local/lib/x86_64-linux-gnu/* /usr/local/lib; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        cp -r /usr/local/lib/aarch64-linux-gnu/* /usr/local/lib; \
    fi

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------

FROM debian:buster-slim

RUN apt-get update && apt-get install -y locales-all && rm -rf /var/lib/apt/lists/*; \
    mkdir -p config && mkdir -p data && mkdir -p app

COPY --from=builder /app/stump_server /app/stump
COPY --from=pdfium /pdfium /opt/pdfium
COPY --from=dav1d /usr/local/lib/ /usr/local/lib/
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
