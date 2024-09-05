#!/bin/bash


if [ "$RUN_PRISMA_GENERATE" = "true" ]; then
  set -ex; \
    cargo prisma generate --schema ./core/prisma/schema.prisma
fi

set -ex; \
  ./scripts/release/utils.sh -w; \
  ./scripts/release/utils.sh -p; \
  cargo build --package stump_server --bin stump_server --features docker --release