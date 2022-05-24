# ------------------------------------------------------------------------------
# Frontend Build Stage
# ------------------------------------------------------------------------------

FROM node:16-alpine3.14 as frontend

WORKDIR /home/stump

COPY frontend/ .

RUN npm install
RUN npm run build

# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

FROM rust:1-alpine3.15 as builder

ENV RUSTFLAGS="-C target-feature=-crt-static"

# https://github.com/briansmith/ring/issues/1414 -> TLDR; might have to add musl-tools clang llvm and 
# the following:
# ENV CC_aarch64_unknown_linux_musl=clang
# ENV AR_aarch64_unknown_linux_musl=llvm-ar
# ENV CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_RUSTFLAGS="-Clink-self-contained=yes -Clinker=rust-lld"

RUN apk add --no-cache --verbose musl-dev build-base sqlite openssl-dev

WORKDIR /home/stump

COPY server/ .

RUN cargo build --release --target=x86_64-unknown-linux-musl

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------

FROM alpine:latest

RUN apk add --no-cache libstdc++

RUN addgroup -g 1000 stump

RUN adduser -D -s /bin/sh -u 1000 -G stump stump

WORKDIR /home/stump

# create the config and data directories
RUN mkdir -p config
RUN mkdir -p data

# copy the binary
COPY --from=builder /home/stump/target/x86_64-unknown-linux-musl/release/stump .

# copy the react build
COPY --from=frontend /home/stump/build static

# *sigh* Rocket requires the toml file at runtime
COPY server/Rocket.toml .

RUN chown stump:stump stump

USER stump

# Default Stump environment variables
ENV STUMP_CONFIG_DIR=/home/stump/config
ENV STUMP_CLIENT_DIR=/home/stump/client

# Default Rocket environment variables
ENV ROCKET_PROFILE=release
ENV ROCKET_LOG_LEVEL=normal

CMD ["./stump"]
