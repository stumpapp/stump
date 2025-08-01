#!/bin/bash

SCRIPTS_DIR="${BASH_SOURCE%/*}/.."
source "${SCRIPTS_DIR}/lib"

# TODO: use words instead...
while getopts "wrdg:" opt; do
  case $opt in
    w)
      workspaces_sed_correction
    ;;
    # TODO: use this and make it work...
    r)
      tags="$OPTARG"
      echo "The tags provided is $OPTARG"
      IFS=',' read -ra TAGS <<< "$tags"
      echo "${IFS}"
      if [ ${#TAGS[@]} -eq 1 ]; then
        # 2. check if the tag ends with 'nightly' or 'experimental'
        if [[ ${TAGS[0]} == *nightly* ]]; then
          echo "Performing nightly sed correction"
          nightly_sed_correction
        elif [[ ${TAGS[0]} == *experimental* ]]; then
          echo "Performing experimental sed correction"
          experimental_sed_correction
        else
          echo "No corrections needed for tag ${TAGS[0]}"
        fi
      else
        echo "No corrections needed for multiple tags"
      fi
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