#!/bin/bash

set -ex; \
  ./scripts/release/utils.sh -w; \
  ./scripts/release/utils.sh -p; \
  cargo build --package stump_server --bin stump_server --release