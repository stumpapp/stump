FROM rust:1-alpine3.15
# https://github.com/rust-lang/docker-rust/issues/85
ENV RUSTFLAGS="-C target-feature=-crt-static"

RUN apk add --no-cache --verbose musl-dev build-base sqlite openssl-dev

WORKDIR /app/server
COPY ./src /app/server/src
COPY ./Cargo.lock /app/server/Cargo.lock
COPY ./Cargo.toml /app/server/Cargo.toml
COPY ./Rocket.toml /app/server/Rocket.toml
# TODO: what to do with frontend?

RUN cargo build --release
RUN strip target/release/stump