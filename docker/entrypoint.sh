#!/usr/bin/env sh

# Depending on the values passed for PUID/PGID via environment variables,
# either starts the stump server daemon as root or as a regular user
# 
# Also takes care of assigning proper attributes to the folders /data, /config and /app
PUID=${PUID:-0}
PGID=${PGID:-0}

USER=stump
GROUP=stump

# GUID between 1-99 are typically reserved for system use, so we warn the user
if [[ "$PUID" -lt 100 && "$PUID" -ne 0 ]]; then
    echo "The provided PGID is below 100. This is typically reserved for system use and may cause unexpected behavior."
fi


# TODO(distroless) ensure that the following checks don't cause issues after moving to distroless
## Add stump group if it doesn't already exist
if [ "$PGID" -gt 60000 ]; then
    echo "Warning: PGID $PGID is too large for BusyBox's addgroup (limit is 60000)"
    echo "Using fallback method to add group..."

    echo "$GROUP:x:$PGID:" >> /etc/group
else
    # ... Exiting logic ... #
    if ! grep -q "^${GROUP}:" /etc/group; then
        echo "Adding group $GROUP with gid $PGID"
        addgroup -g $PGID $GROUP
    fi
fi
## Add stump user if it doesn't already exist
if ! grep -q "^${USER}:" /etc/passwd; then
    echo "Adding user $USER with uid $PUID"
    adduser -u $PUID -G $GROUP -D -H $USER
fi

# If a TZ is set, symlink /etc/localtime to it
if [ -n "${TZ:-}" ]; then
    echo "Setting timezone to $TZ"
    rm -f /etc/localtime # Remove existing symlink if present (shouldn't be)
    ln -snf "/usr/share/zoneinfo/$TZ" /etc/localtime
    echo "$TZ" > /etc/timezone
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
    exec su $USER -s /app/stump -- "$@"
fi
