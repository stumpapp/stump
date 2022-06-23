# ------------------------------------------------------------------------------
# Frontend Build Stage
# ------------------------------------------------------------------------------

FROM node:16-alpine3.14 as frontend

WORKDIR /app

COPY apps/client/ .

RUN npm install
RUN npm run build

# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

# This stage is used for arm64, skipped otherwise by buildx
FROM messense/rust-musl-cross:aarch64-musl AS arm64-backend

WORKDIR /app

COPY .cargo .cargo
COPY core/ .

# Workaround as otherwise container would err during crates.io index updating
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

RUN rustup target add aarch64-unknown-linux-musl && \
    cargo build --release --target aarch64-unknown-linux-musl && \
    cp target/aarch64-unknown-linux-musl/release/stump .

# This stage is used for amd64, skipped otherwise by buildx
FROM messense/rust-musl-cross:x86_64-musl AS amd64-backend

WORKDIR /app

COPY .cargo .cargo
COPY core/ .

RUN rustup target add x86_64-unknown-linux-musl && \
    cargo build --release --target x86_64-unknown-linux-musl && \
    cp target/x86_64-unknown-linux-musl/release/stump .

# Conditional to skip non-targetarch build stages
FROM ${TARGETARCH}-backend AS backend-build

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------
FROM alpine:latest

RUN apk add --no-cache libstdc++

RUN addgroup -g 1000 stump

RUN adduser -D -s /bin/sh -u 1000 -G stump stump

WORKDIR /

# create the config, data and app directories
RUN mkdir -p config
RUN mkdir -p data
RUN mkdir -p app

# copy the binary
COPY --from=backend-build /app/stump /app/stump

# copy the react build
COPY --from=frontend /app/build /app/client

# *sigh* Rocket requires the toml file at runtime
COPY core/Rocket.toml /app/Rocket.toml

RUN chown stump:stump stump

USER stump

# Default Stump environment variables
ENV STUMP_CONFIG_DIR=/config
ENV STUMP_CLIENT_DIR=/app/client

# Default Rocket environment variables
ENV ROCKET_PROFILE=release
ENV ROCKET_LOG_LEVEL=normal
ENV ROCKET_PORT=10801

CMD ["./stump"]
