#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: prepare-camera-test-environment.sh <production-env> <camera-test-env>" >&2
  exit 2
fi

production_env=$(realpath "$1")
output_path=$(realpath -m "$2")
project_root=$(realpath "$(dirname "$0")/..")

case "$production_env" in
  "$project_root"/*) ;;
  *) echo "Production environment must be inside the Stream project." >&2; exit 2 ;;
esac
case "$output_path" in
  "$project_root"/*) ;;
  *) echo "Camera test environment must be inside the Stream project." >&2; exit 2 ;;
esac

[[ -f "$production_env" ]] || {
  echo "Production environment does not exist." >&2
  exit 2
}

set -a
# shellcheck disable=SC1090
source "$production_env"
set +a

[[ "${CLOUDFLARE_STREAM_ENABLED:-}" == "true" ]]
[[ "${CLOUDFLARE_ACCOUNT_ID:-}" =~ ^[a-fA-F0-9]{32}$ ]]
[[ "${CLOUDFLARE_API_TOKEN:-}" =~ ^cfat_[A-Za-z0-9_-]{40,}$ ]]
[[ -n "${CLOUDFLARE_STREAM_LIVE_INPUT_ID:-}" ]]
[[ -n "${LOCAL_DEMO_PASSWORD:-}" ]]

umask 077
{
  printf '%s\n' 'OWNER_APPROVED_CAMERA_TEST=yes'
  printf '%s\n' 'STREAM_VERIFY_BASE_URL=https://holiwyn.online'
  printf '%s\n' 'BROADCAST_HOLD_MS=60000'
  printf 'CLOUDFLARE_ACCOUNT_ID=%s\n' "$CLOUDFLARE_ACCOUNT_ID"
  printf 'CLOUDFLARE_API_TOKEN=%s\n' "$CLOUDFLARE_API_TOKEN"
  printf 'CLOUDFLARE_STREAM_LIVE_INPUT_ID=%s\n' "$CLOUDFLARE_STREAM_LIVE_INPUT_ID"
  printf 'LOCAL_DEMO_PASSWORD=%s\n' "$LOCAL_DEMO_PASSWORD"
} > "$output_path"
chmod 600 "$output_path"

echo "Prepared a restricted camera-test environment without printing secrets."
