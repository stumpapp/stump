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

RUN npm install -g pnpm

RUN pnpm i
RUN pnpm web build

RUN mv ./apps/web/dist build

# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

######################
### aarch64 / arm64 ##
######################

FROM messense/rust-musl-cross:aarch64-musl AS arm64-backend

ARG GIT_REV
ENV GIT_REV=${GIT_REV}

WORKDIR /app

ENV CARGO_NET_GIT_FETCH_WITH_CLI=true
RUN rustup target add aarch64-unknown-linux-musl

# TODO: make one-liner
COPY .cargo .cargo
COPY scripts scripts
COPY Cargo.toml Cargo.lock ./

# Run the build utils script to create the dummy rust files for core and server
RUN set -ex; \
    ./scripts/release/build-utils.sh -w; \
    ./scripts/release/build-utils.sh -d './core'; \
    ./scripts/release/build-utils.sh -d './apps/server'

# Copy the core and server Cargo.{toml,lock} files
COPY ./apps/server/Cargo.toml ./apps/server/
COPY ./core/Cargo.toml ./core/

# This is where the ~magic~ happens. We build the server (which pulls the core as a dependency) with
# the dummy files we created above. This ~should~ allow caching until the dependencies themselves change.
RUN set -ex; \
    cargo build --release --target aarch64-unknown-linux-musl; \
    rm -rf apps/server/src; \
    rm -rf core/src

# Now we can copy the real source files and build the server
COPY . .
COPY ./core/src/prisma.rs ./core/src/prisma.rs

RUN set -ex; \
    ./scripts/release/build-utils.sh -p; \
    cargo build --package stump_server --bin stump_server --release --target aarch64-unknown-linux-musl; \
    cp target/aarch64-unknown-linux-musl/release/stump_server ./stump

# FIXME: armv7 is currently broken. I have a gut it needs a similar workaround as the arm64 
######################
### armv7 / arm/v7 ###
######################

# Note: the name here isn't entirely accurate to my understanding. But I can't figure
# out how to have the name be v7 inclusive so
FROM messense/rust-musl-cross:armv7-musleabihf@sha256:3e133558686fd5059ce25749cece40a81d87dad2c7a68727c36a1bcacba6752c AS arm-backend

ARG GIT_REV
ENV GIT_REV=${GIT_REV}

WORKDIR /app

ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

RUN rustup update && rustup target add armv7-unknown-linux-musleabihf

# TODO: make one-liner
COPY .cargo .cargo
COPY scripts scripts
COPY Cargo.toml Cargo.lock ./

# Run the build utils script to create the dummy rust files for core and server
RUN set -ex; \
    ./scripts/release/build-utils.sh -w; \
    ./scripts/release/build-utils.sh -d './core'; \
    ./scripts/release/build-utils.sh -d './apps/server'

# Copy the core and server Cargo.{toml,lock} files
COPY ./apps/server/Cargo.toml ./apps/server/
COPY ./core/Cargo.toml ./core/

# This is where the ~magic~ happens. We build the server (which pulls the core as a dependency) with
# the dummy files we created above. This ~should~ allow caching until the dependencies themselves change.
RUN set -ex; \
    cargo build --release --target armv7-unknown-linux-musleabihf; \
    rm -rf apps/server/src; \
    rm -rf core/src

# Now we can copy the real source files and build the server
COPY . .
COPY ./core/src/prisma.rs ./core/src/prisma.rs

RUN set -ex; \
    ./scripts/release/build-utils.sh -p; \
    cargo build --package stump_server --bin stump_server --release --target armv7-unknown-linux-musleabihf; \
    cp target/armv7-unknown-linux-musleabihf/release/stump_server ./stump

######################
### x86_64 / amd64 ###
######################

FROM messense/rust-musl-cross:x86_64-musl AS amd64-backend

ARG GIT_REV
ENV GIT_REV=${GIT_REV}


WORKDIR /app

ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

RUN rustup update && rustup target add x86_64-unknown-linux-musl

# TODO: make one-liner
COPY .cargo .cargo
COPY scripts scripts
COPY Cargo.toml Cargo.lock ./

# Run the build utils script to create the dummy rust files for core and server
RUN set -ex; \
    ./scripts/release/build-utils.sh -w; \
    ./scripts/release/build-utils.sh -d './core'; \
    ./scripts/release/build-utils.sh -d './apps/server'

# Copy the core and server Cargo.{toml,lock} files
COPY ./apps/server/Cargo.toml ./apps/server/
COPY ./core/Cargo.toml ./core/

# This is where the ~magic~ happens. We build the server (which pulls the core as a dependency) with
# the dummy files we created above. This ~should~ allow caching until the dependencies themselves change.
RUN set -ex; \
    cargo build --release --target x86_64-unknown-linux-musl; \
    rm -rf apps/server/src; \
    rm -rf core/src

# Now we can copy the real source files and build the server
COPY . .
COPY ./core/src/prisma.rs ./core/src/prisma.rs

RUN set -ex; \
    ./scripts/release/build-utils.sh -p; \
    cargo build --package stump_server --bin stump_server --release --target x86_64-unknown-linux-musl; \
    cp target/x86_64-unknown-linux-musl/release/stump_server ./stump

######################
## Conditional step ##
######################

# Conditional to skip non-targetarch build stages
FROM ${TARGETARCH}-backend AS core-builder

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------
FROM alpine:latest

# libc6-compat
RUN apk add --no-cache libstdc++ binutils

WORKDIR /

# create the config, data and app directories
RUN mkdir -p config && \
    mkdir -p data && \
    mkdir -p app

# copy the binary
COPY --from=core-builder /app/stump ./app/stump

# copy the react build
COPY --from=frontend /app/build ./app/client

# Copy docker entrypoint
# This will take care of starting the service daemon as a regular user, if desired
COPY scripts/release/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# TODO: replace this with something more elegant lol maybe a bash case statement
RUN ln -s /lib/ld-musl-aarch64.so.1 /lib/ld-linux-aarch64.so.1; exit 0

# Default Stump environment variables
ENV STUMP_CONFIG_DIR=/config
ENV STUMP_CLIENT_DIR=/app/client
ENV STUMP_PROFILE=release
ENV STUMP_PORT=10801
ENV STUMP_IN_DOCKER=true

ENV API_VERSION=v1

WORKDIR /app

ENTRYPOINT ["/entrypoint.sh"]
