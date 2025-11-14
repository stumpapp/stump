#!/bin/bash

_ENGINE=${ENGINE:-docker}
_FORMAT=${FORMAT:-auto}
_PLATFORMS=${PLATFORMS:-linux/amd64}
_TAGS=${TAGS:-"aaronleopold/stump:nightly"}
_GIT_REV=${GIT_REV:-$(git rev-parse --short HEAD)}
_BUILD_CHANNEL=${BUILD_CHANNEL:-}
_PUSH=${PUSH:-false}

FORMATTED_TAGS=""
for tag in ${_TAGS//,/}; do
  FORMATTED_TAGS="$FORMATTED_TAGS --tag $tag"
done

PUSH_OR_LOAD_ARG="--load"
# Not supported? https://github.com/containers/buildah/issues/4671
# if [ "$_PUSH" = true ]; then
#   PUSH_OR_LOAD_ARG="--output=type=registry"
# fi

echo "Building with tag arguments: $FORMATTED_TAGS"

set -ex; \
${_ENGINE} buildx build \
  -f ./docker/Dockerfile \
  ${PUSH_OR_LOAD_ARG} \
  --progress=$_FORMAT \
  --platform=$_PLATFORMS \
  ${FORMATTED_TAGS} \
  --build-arg GIT_REV=$_GIT_REV \
  --build-arg BUILD_CHANNEL=$_BUILD_CHANNEL .