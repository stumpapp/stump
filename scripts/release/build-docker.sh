#!/bin/bash

FORMAT=${1:-auto}
PLATFORMS=${2:-linux/amd64}
TAG=${3:-nightly}
GIT_REV=$(git rev-parse --short HEAD)

docker buildx build -f ./scripts/release/Dockerfile --load --progress=$FORMAT --platform=$PLATFORMS -t aaronleopold/stump:$TAG --build-arg GIT_REV=$GIT_REV .