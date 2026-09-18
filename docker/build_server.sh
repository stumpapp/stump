#!/bin/bash

set -ex; \
  sed -i '/core\/integration-tests/d' Cargo.toml; \
  sed -i '/apps\/desktop\/src-tauri/d' Cargo.toml; \
  cargo build --package stump_server --bin stump_server --release
