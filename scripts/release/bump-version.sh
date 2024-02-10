#!/bin/bash

# https://github.com/pksunkara/cargo-workspaces#version
_BUMP=${BUMP:?bump is required}
_GENERATE_CHANGELOG=${GENERATE_CHANGELOG:=1}

# desktop, mobile, core -> default is core
_TARGETS=${TARGETS:=core}

# If no targets are specified, exit. This _shouldn't_ happen since the default is core
if [ -z "$_TARGETS" ]; then
  echo "No targets specified. Exiting..."
  exit 1
fi


if [[ $_TARGETS == *"core"* ]]; then
 # Bump the Cargo workspaces version, this is interactive
  cargo workspaces version $BUMP --no-git-commit

  # Get the current version in the root package.json
  _VERSION=$(jq -r '.version' package.json)

  # Update the version according to the bump (major, minor, patch)
  _NEW_VERSION=$(pnpx semver $_VERSION -i $_BUMP)

  # Update the version in the root package.json and in: (apps/*/package.json, packages/*/package.json, interface/package.json)
  PATHS=("package.json" "apps/*/package.json" "packages/*/package.json" "interface/package.json")
  for path in ${PATHS[@]}; do
    jq ".version = \"$_NEW_VERSION\"" $path > tmp.$$.json && mv tmp.$$.json $path
  done

  # Fix the formatting of the JSON files from the previous step 
  pnpm prettify
fi

# https://docs.gitmoji-changelog.dev/#/?id=%f0%9f%93%9a-how-it-works
if [ $_GENERATE_CHANGELOG == 1 ]; then
  pnpx gitmoji-changelog
fi