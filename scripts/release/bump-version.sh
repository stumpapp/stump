#!/bin/bash

# https://github.com/pksunkara/cargo-workspaces#version
_BUMP=${BUMP:?bump is required}
_GENERATE_CHANGELOG=${GENERATE_CHANGELOG:=0}

# desktop,mobile,core
_TARGETS=${TARGETS:=$@}

# SCRIPTS_DIR="${BASH_SOURCE%/*}/.."
# source "${SCRIPTS_DIR}/lib"

# TODO: implement some sort of release system! This is all scratch work


# if no targets, exit
if [ -z "$_TARGETS" ]; then
  echo "No targets specified. Exiting..."
  exit 1
fi

# TODO: bump based on targets!!

# cargo workspaces version $BUMP --no-git-commit

# https://docs.gitmoji-changelog.dev/#/?id=%f0%9f%93%9a-how-it-works
if [ $_GENERATE_CHANGELOG == 1 ]; then
  pnpx gitmoji-changelog
fi