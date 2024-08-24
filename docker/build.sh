#!/bin/bash

_RUNTIME=${RUNTIME:-docker}
_FORMAT=${FORMAT:-auto}
_PLATFORMS=${PLATFORMS:-linux/amd64}
_TAGS=${TAGS:-"aaronleopold/stump:nightly"}
_RUN_PRISMA_GENERATE=${RUN_PRISMA_GENERATE:=false}
_GIT_REV=${GIT_REV:-$(git rev-parse --short HEAD)}

FORMATTED_TAGS=""
for tag in ${_TAGS//,/}; do
  FORMATTED_TAGS="$FORMATTED_TAGS --tag $tag"
done

echo "Building with tag arguments: $FORMATTED_TAGS"

set -ex; \
${_RUNTIME} buildx build \
  -f ./docker/Dockerfile \
  --load \
  --progress=$_FORMAT \
  --platform=$_PLATFORMS \
  ${FORMATTED_TAGS} \
  --build-arg GIT_REV=$_GIT_REV \
  --build-arg RUN_PRISMA_GENERATE=$_RUN_PRISMA_GENERATE .
