#!/bin/bash

set -ex; \
  ./scripts/release/utils.sh -w; \
  cargo build --package stump_server --bin stump_server --release