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

FROM rust:1-alpine3.15 as builder

ENV RUSTFLAGS="-C target-feature=-crt-static"

RUN apk add --no-cache --verbose musl-dev build-base sqlite openssl-dev

WORKDIR /app

COPY core/ .

RUN cargo build --release --target=x86_64-unknown-linux-musl

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------

FROM alpine:latest

RUN apk add --no-cache libstdc++

RUN addgroup -g 1000 stump

RUN adduser -D -s /bin/sh -u 1000 -G stump stump

WORKDIR /

# create the config and data directories
RUN mkdir -p app
RUN mkdir -p config
RUN mkdir -p data

# copy the binary
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/stump /app/stump

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
