#!/bin/bash

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


## Add stump group if it doesn't already exist
if [[ -z "$(getent group "$PGID" | cut -d':' -f1)" ]]; then
    echo "Adding group $GROUP with gid $PGID"
    addgroup --gid "$PGID" "$GROUP"
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
    adduser --system --shell /bin/bash --no-create-home --uid "$PUID" --gid "$PGID" "$USER"
else
    echo "User $USER with uid $PUID already exists"
    # If the user name is not stump, we need to update USER as to avoid errors later
    if [[ "$(getent passwd "$PUID" | cut -d':' -f1)" != "$USER" ]]; then
        USER="$(getent passwd "$PUID" | cut -d':' -f1)"
        echo "User name '$USER' does not match expected name 'stump'. Using '$USER' instead."
    fi

fi

# If a TZ is set, symlink /etc/localtime to it
if [[ -n "$TZ" ]]; then
    echo "Setting timezone to $TZ"
    rm -f /etc/localtime # Remove existing symlink if present (shouldn't be)
    ln -snf "/usr/share/zoneinfo/$TZ" /etc/localtime
    echo "$TZ" > /etc/timezone
fi

# Change current working directory
cd /app

# Make sure shared libraries are linked
echo '/usr/local/lib' >> /etc/ld.so.conf.d/mylibs.conf && ldconfig

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
