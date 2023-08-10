#!/bin/sh

# Depending on the values passed for PUID/PGID via environment variables,
# either starts the stump server daemon as root or as a regular user
# 
# Also takes care of assigning proper attributes to the folders /data, /config and /app
PUID=${PUID:-0}
PGID=${PGID:-0}

USER=stump
GROUP=stump

# echo warning if the GUID is 1-99, as these are typically reserved for system use
if [[ "$PGID" -lt 100 ]]; then
    echo "Warning: PGID is below 100. This is typically reserved for system use and may cause unexpected behavior."
fi


## Add stump group if it doesn't already exist
if [[ -z "$(getent group "$PGID" | cut -d':' -f1)" ]]; then
    echo "Adding group $GROUP with gid $PGID"
    addgroup -g "$PGID" "$GROUP"
else
    echo "Group gid $PGID already exists"
    # If the group name is not stump, we need to update GROUP as to avoid errors later
    if [[ "$(getent group "$PGID" | cut -d':' -f1)" != "$GROUP" ]]; then
        GROUP="$(getent group "$PGID" | cut -d':' -f1)"
        echo "Group name '$GROUP' does not match expected name 'stump'. Using '$GROUP' instead."
    fi
fi

## Add stump user if it doesn't already exist
if [[ -z "$(getent passwd "$PUID" | cut -d':' -f1)" ]]; then
    echo "Adding user $USER with uid $PUID"
    adduser -D -s /bin/sh -u "$PUID" -G "$GROUP" "$USER"
else
    echo "User $USER with uid $PUID already exists"
    # TODO: we may wind up needing a similar work around for the user name as we did for the group name 
fi

# Change current working directory
cd /app

if [[ "$PUID" -eq 0 ]]; then
    # Run as root
    /app/stump
else
    # Set ownership on config, app, and data dir
    chown -R "$PUID":"$PGID" /app
    chown -R "$PUID":"$PGID" /config
    # NOTE: Only change the directory itself, not recursively
    # We don't want to accidentally overwrite with incorrect
    # permissions if users provide wrong values for PUID/PGID
    chown "$PUID":"$PGID" /data

    # Run as non-root user
    # NOTE: Omit "-l" switch to keep env vars
    su "$USER" -c /app/stump
fi
