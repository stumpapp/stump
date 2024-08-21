#!/bin/bash

_FORMAT=${FORMAT:-auto}
_PLATFORMS=${PLATFORMS:-linux/amd64}
_TAG=${TAG:-nightly}
_RUN_PRISMA_GENERATE=${RUN_PRISMA_GENERATE:=false}

docker buildx build -f ./docker/Dockerfile --load --progress=$_FORMAT --platform=$_PLATFORMS -t aaronleopold/stump:$_TAG --build-arg GIT_REV=$(git rev-parse --short HEAD) --build-arg RUN_PRISMA_GENERATE=$_RUN_PRISMA_GENERATE .
