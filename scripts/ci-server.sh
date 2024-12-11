#!/bin/bash

_CONFIG_DIR=${CONFIG_DIR:="/tmp/stump-ci-config"}
_CLIENT_DIR=${CLIENT_DIR:="apps/web/dist"}

# Ensure the web app is built before moving the dist folder
if [ -z "$(ls -A apps/web/dist)" ]; then
  echo "Building the web app"
  yarn web build
fi

# If there is a DB file in the config directory, remove it
if [ -f "${_CONFIG_DIR}/stump.db" ]; then
  echo "Removing the existing DB file"
  rm "${_CONFIG_DIR}/stump.db"
fi

# Start the server
STUMP_PORT=5869 \
STUMP_CONFIG_DIR=${_CONFIG_DIR} \
STUMP_CLIENT_DIR=${_CLIENT_DIR} \
STUMP_VERBOSITY=3 \
STUMP_PROFILE=release \
STUMP_PRETTY_LOGS=true \
  cargo run --package stump_server --release