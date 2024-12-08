#!/bin/bash

_CONFIG_DIR=${CONFIG_DIR:="/tmp/stump-ci-config"}


# Ensure the web app is built before moving the dist folder
if [ -z "$(ls -A apps/web/dist)" ]; then
  echo "Building the web app"
  npm run build --prefix apps/web
fi

# Start the server
STUMP_PORT=5869 \
STUMP_CONFIG_DIR=${_CONFIG_DIR} \
STUMP_PROFILE=debug \
STUMP_VERBOSITY=2 \
STUMP_PRETTY_LOGS=true \
  cargo run --package stump_server