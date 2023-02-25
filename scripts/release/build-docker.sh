#!/bin/bash

FORMAT=${1:-auto}
GIT_REV=$(git rev-parse --short HEAD)
set GIT_REV=$GIT_REV
# docker buildx build -f ./scripts/release/Dockerfile --push --platform=linux/arm64/v8,linux/amd64 -t aaronleopold/stump-preview:latest .
docker buildx build -f ./scripts/release/Dockerfile --push --progress=$FORMAT --platform=linux/amd64 -t aaronleopold/stump-preview:latest .