#!/bin/bash

SCRIPTS_DIR="${BASH_SOURCE%/*}/.."
source "${SCRIPTS_DIR}/lib"

# TODO: use words instead...
while getopts "pwdg:" opt; do
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
    g)
      arch="$OPTARG"
      echo "The arch provided is $OPTARG"
      download_pdfium $arch
    ;;
    ?) 
      echo "Invalid option -$OPTARG" >&2
      exit 1
    ;;
  esac
done
shift "$(($OPTIND -1))"