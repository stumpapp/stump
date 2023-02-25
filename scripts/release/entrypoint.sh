#!/bin/sh
# Depending on the values passed for PUID/PGID via environment variables,
# either starts the stump server daemon as root or as a regular user
# 
# Also takes care of assigning proper attributes to the folders /data, /config and /app
PUID=${PUID:-0}
PGID=${PGID:-0}

USER=stump
GROUP=stump

## Add stump group if it doesn't already exist
if [[ -z "$(getent group "$PGID" | cut -d':' -f1)" ]]; then
    addgroup -g "$PGID" $GROUP
fi

## Add stump user if it doesn't already exist
if [[ -z "$(getent passwd "$PUID" | cut -d':' -f1)" ]]; then
    adduser -D -s /bin/sh -u "$PUID" -G "$GROUP" $USER
fi

# Change current working directory
cd /app

if [[ "$PUID" -eq 0 ]]; then
    # Run as root
    ./stump
else
    # Set ownership on config, app and data dir
    chown -R "$PUID":"$PGID" /app
    chown -R "$PUID":"$PGID" /config
    # NOTE: Only change the directory itself, not recursively
    # We dont want to accidentally overwrite with incorrect
    # permissions if users provide wrong values for PUID/PGID
    chown "$PUID":"$PGID" /data

    # Run as non-root user
    # NOTE: Omit "-l" switch to keep env vars
    su $USER -c ./stump
fi
