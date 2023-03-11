#!/bin/bash

SCRIPTS_DIR="${BASH_SOURCE%/*}/.."
source "${SCRIPTS_DIR}/lib"

while getopts "pwd:" opt; do
  case $opt in
    p)
      prisma_sed_correction
    ;;
    w)
      workspaces_sed_correction
    ;;
    d)
      path="$OPTARG"
      echo "The path provided is $OPTARG"
      create_dummy_rust_file $path
    ;;
    ?) 
      echo "Invalid option -$OPTARG" >&2
      exit 1
    ;;
  esac
done
shift "$(($OPTIND -1))"