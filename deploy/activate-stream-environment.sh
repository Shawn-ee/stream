#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: activate-stream-environment.sh <production-env> <incoming-stream-env>" >&2
  exit 2
fi

production_env=$(realpath "$1")
incoming_env=$(realpath "$2")
project_root=$(realpath "$(dirname "$0")/..")

case "$production_env" in
  "$project_root"/*) ;;
  *) echo "Production environment must be inside the Stream project." >&2; exit 2 ;;
esac
case "$incoming_env" in
  "$project_root"/*) ;;
  *) echo "Incoming environment must be inside the Stream project." >&2; exit 2 ;;
esac

[[ -f "$production_env" && -f "$incoming_env" ]] || {
  echo "Both environment files must exist." >&2
  exit 2
}

set -a
# shellcheck disable=SC1090
source "$incoming_env"
set +a

[[ "${CLOUDFLARE_STREAM_ENABLED:-}" == "true" ]]
[[ "${CLOUDFLARE_ACCOUNT_ID:-}" =~ ^[a-fA-F0-9]{32}$ ]]
[[ "${CLOUDFLARE_API_TOKEN:-}" =~ ^cfat_[A-Za-z0-9_-]{40,}$ ]]
[[ -n "${CLOUDFLARE_STREAM_CUSTOMER_CODE:-}" && ${#CLOUDFLARE_STREAM_CUSTOMER_CODE} -ge 8 ]]
[[ -n "${CLOUDFLARE_STREAM_LIVE_INPUT_ID:-}" && ${#CLOUDFLARE_STREAM_LIVE_INPUT_ID} -ge 16 ]]
[[ -z "${CLOUDFLARE_STREAM_SIGNING_KEY_ID:-}" ]] || [[ "${CLOUDFLARE_STREAM_SIGNING_KEY_ID}" =~ ^[a-fA-F0-9]{32}$ ]]
[[ -z "${CLOUDFLARE_STREAM_SIGNING_JWK:-}" ]] || [[ ${#CLOUDFLARE_STREAM_SIGNING_JWK} -ge 100 ]]
if [[ -n "${CLOUDFLARE_STREAM_SIGNING_KEY_ID:-}" || -n "${CLOUDFLARE_STREAM_SIGNING_JWK:-}" ]]; then
  [[ -n "${CLOUDFLARE_STREAM_SIGNING_KEY_ID:-}" && -n "${CLOUDFLARE_STREAM_SIGNING_JWK:-}" ]]
fi

umask 077
backup_dir="$project_root/backups"
mkdir -p "$backup_dir"
backup_path="$backup_dir/pre-stream-activation-$(date -u +%Y%m%dT%H%M%SZ).env"
cp "$production_env" "$backup_path"
chmod 600 "$backup_path"

next_env="${production_env}.next"
while IFS= read -r line || [[ -n "$line" ]]; do
  key=${line%%=*}
  case "$key" in
    CLOUDFLARE_STREAM_ENABLED|CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_API_TOKEN|CLOUDFLARE_STREAM_CUSTOMER_CODE|CLOUDFLARE_STREAM_LIVE_INPUT_ID|CLOUDFLARE_STREAM_SIGNING_KEY_ID|CLOUDFLARE_STREAM_SIGNING_JWK)
      printf '%s=%s\n' "$key" "${!key}" ;;
    *) printf '%s\n' "$line" ;;
  esac
done < "$production_env" > "$next_env"

for key in CLOUDFLARE_STREAM_SIGNING_KEY_ID CLOUDFLARE_STREAM_SIGNING_JWK; do
  if ! grep -q "^${key}=" "$production_env"; then
    printf '%s=%s\n' "$key" "${!key:-}" >> "$next_env"
  fi
done

chmod 600 "$next_env"
mv "$next_env" "$production_env"
rm -f "$incoming_env"
echo "Cloudflare Stream production fields activated; secret values were not printed."
