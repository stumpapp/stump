#!/usr/bin/env bash
set -euo pipefail

# realistically it should be very rare i add to this list, the following are loose
# guidelines for posterity i will aim to follow:
# - items with no patches and no known workarounds that cannot easily be mitigated
#   within a timely manner without serious effort
# - items that are not part of released code, e.g. dev dependencies and tooling
ALLOWED_ADVISORIES="$*"

if [ -n "$ALLOWED_ADVISORIES" ]; then
  echo "running audit with allowed advisories: $ALLOWED_ADVISORIES"
fi

set +e
AUDIT_JSON=$(yarn audit --json --groups dependencies 2>&1)
set -e

if ! echo "$AUDIT_JSON" | jq -e 'select(.type == "auditSummary")' > /dev/null 2>&1; then
    echo "ERROR: yarn audit did not complete successfully"
    echo "$AUDIT_JSON"
    exit 1
fi

NON_ALLOWED=$(echo "$AUDIT_JSON" | jq -r --arg allowed "$ALLOWED_ADVISORIES" '
select(.type == "auditAdvisory") |
.data.advisory.id | tostring |
. as $id |
if $allowed == "" then
    $id
else
    if ($allowed | split(" ") | map(select(length > 0)) | index($id)) then
    empty
    else
    $id
    end
end
')

if [ -z "$NON_ALLOWED" ]; then
    echo "✅ audit passed"
    exit 0
fi

# at one point i had this workflow create an issue, but i think that kind of
# blast messaging is probably not the best for tentative CVEs lol
echo "🚨 audit failed with non-allowed advisories: $NON_ALLOWED"
yarn audit --groups dependencies || true
exit 1
