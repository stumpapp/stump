#!/bin/bash

FORMAT=${1:-auto}
PLATFORMS=${2:-linux/amd64}
TAG=${3:-latest}

GIT_REV=$(git rev-parse --short HEAD)
set GIT_REV=$GIT_REV

# docker buildx build -f ./scripts/release/Dockerfile --push --platform=linux/arm64/v8,linux/amd64 -t aaronleopold/stump-preview:latest .
docker buildx build -f ./scripts/release/Dockerfile --push --progress=$FORMAT --platform=$PLATFORMS -t aaronleopold/stump-preview:$TAG .