#!/bin/bash

# https://github.com/pksunkara/cargo-workspaces#version
_BUMP=${BUMP:?bump is required}

# desktop,mobile,core
_TARGETS=${TARGETS:=$@}

# SCRIPTS_DIR="${BASH_SOURCE%/*}/.."
# source "${SCRIPTS_DIR}/lib"


# if no targets, exit
if [ -z "$_TARGETS" ]; then
  echo "No targets specified. Exiting..."
  exit 1
fi

# TODO: bump based on targets

# cargo workspaces version $BUMP --no-git-commit