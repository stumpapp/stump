#!/usr/bin/env bash

# starts server intended for e2e testing web app:
#   scripts/e2e-server.sh                      # state between runs
#   STUMP_E2E_FRESH=1 scripts/e2e-server.sh    # clean slate between runs

set -eu

E2E_DIR="${E2E_DIR:-${TMPDIR:-/tmp}/stump-e2e}"
if [ "${STUMP_E2E_FRESH:-0}" = "1" ]; then
	rm -rf "$E2E_DIR"
fi

export STUMP_CONFIG_DIR="$E2E_DIR"
export STUMP_PORT=10801
export STUMP_ALLOWED_ORIGINS="http://localhost:3000"
export STUMP_OIDC_CLIENT_ID=test-client
export STUMP_OIDC_CLIENT_SECRET=test-secret
export STUMP_OIDC_ISSUER_URL=http://localhost:9000
export STUMP_OIDC_GROUPS_CLAIM=groups
export STUMP_OIDC_GROUP_PERMISSION_MAPPING='{"admins":["MANAGE_SERVER"],"readers":[]}'
# TODO: ^ think more meaningfully about this for tests

exec cargo run -p stump_server --release
