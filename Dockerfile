# ------------------------------------------------------------------------------
# Frontend Build Stage
# ------------------------------------------------------------------------------

FROM node:16-alpine3.14 as frontend
ARG TARGETARCH

WORKDIR /app

COPY apps/client/ .

RUN npm install
RUN npm run build

# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

######################
### aarch64 / arm64 ##
######################

FROM messense/rust-musl-cross:aarch64-musl AS arm64-backend

WORKDIR /app

COPY .cargo .cargo
COPY core/ .

# Workaround as otherwise container would err during crates.io index updating
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

RUN rustup target add aarch64-unknown-linux-musl

RUN cargo build --release --target aarch64-unknown-linux-musl && \
    cp target/aarch64-unknown-linux-musl/release/stump .

######################
### armv7 / arm/v7 ###
######################

# Note: the name here isn't entirely accurate to my understanding. But I can't figure
# out how to have the name be v7 inclusive so
FROM messense/rust-musl-cross:armv7-musleabihf@sha256:3e133558686fd5059ce25749cece40a81d87dad2c7a68727c36a1bcacba6752c AS arm-backend

WORKDIR /app

COPY .cargo .cargo
COPY core/ .

# Workaround as otherwise container would err during crates.io index updating
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

RUN rustup target add armv7-unknown-linux-musleabihf

RUN cargo build --release --target armv7-unknown-linux-musleabihf && \
    cp target/armv7-unknown-linux-musleabihf/release/stump .

######################
### x86_64 / amd64 ###
######################

FROM messense/rust-musl-cross:x86_64-musl AS amd64-backend

WORKDIR /app

COPY .cargo .cargo
COPY core/ .

RUN rustup target add x86_64-unknown-linux-musl

RUN cargo build --release --target x86_64-unknown-linux-musl && \
    cp target/x86_64-unknown-linux-musl/release/stump .

######################
## Conditional step ##
######################

# Conditional to skip non-targetarch build stages
FROM ${TARGETARCH}-backend AS core-builder

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------
FROM alpine:latest

# TODO: remove binutils, adding for debug options
RUN apk add --no-cache libstdc++ binutils libc6-compat

RUN addgroup -g 1000 stump

RUN adduser -D -s /bin/sh -u 1000 -G stump stump

WORKDIR /

# create the config, data and app directories
RUN mkdir -p config
RUN mkdir -p data
RUN mkdir -p app

# copy the binary
COPY --from=core-builder /app/stump ./app/stump

# copy the react build
COPY --from=frontend /app/build ./app/client

# *sigh* Rocket requires the toml file at runtime, at CWD
COPY core/Rocket.toml ./app/Rocket.toml

RUN chown stump:stump ./app/stump

USER stump

# TODO: replace this with something more elegant lol maybe a bash case statement
RUN ln -s /lib/ld-musl-aarch64.so.1 /lib/ld-linux-aarch64.so.1; exit 0

# Default Stump environment variables
ENV STUMP_CONFIG_DIR=/config
ENV STUMP_CLIENT_DIR=/app/client

# Default Rocket environment variables
ENV ROCKET_PROFILE=release
ENV ROCKET_LOG_LEVEL=normal
ENV ROCKET_PORT=10801

WORKDIR /app

CMD ["./stump"]
