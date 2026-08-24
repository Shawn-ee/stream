#!/bin/sh
set -eu

# Guarded operator for an explicitly approved private Linux staging host.
# Merely having this script does not authorize host inspection or mutation.

NODE_IMAGE='node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43'
APPROVAL_PHRASE='I_APPROVE_PRIVATE_STAGING'
COMPOSE_FILE='docker-compose.production.yml'

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
cd "$repository_root"

action=${1:-}
environment_file=${PRODUCTION_ENV_FILE:-.env.production}
project_name=${STREAM_COMPOSE_PROJECT_NAME:-stream-launch-candidate}

fail() {
  printf 'ERROR %s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: deploy/private-staging-operator.sh ACTION

Read-only actions: preflight, plan, status, verify
Mutating actions:  start, stop

Required for every action:
  STREAM_PRIVATE_STAGING_APPROVED=I_APPROVE_PRIVATE_STAGING
  EXPECTED_RELEASE_COMMIT=<owner-approved 40-character commit>

Also required for a mutating action:
  APPROVED_STAGING_ACTION=start   or   APPROVED_STAGING_ACTION=stop

Optional:
  PRODUCTION_ENV_FILE=/absolute/path/to/.env.production
  STREAM_COMPOSE_PROJECT_NAME=stream-launch-candidate
EOF
}

case "$action" in
  preflight|plan|status|verify|start|stop) ;;
  *) usage; exit 2 ;;
esac

[ "${STREAM_PRIVATE_STAGING_APPROVED:-}" = "$APPROVAL_PHRASE" ] ||
  fail "private staging owner approval is not recorded for this execution"

expected_commit=${EXPECTED_RELEASE_COMMIT:-}
printf '%s' "$expected_commit" | grep -Eq '^[0-9a-fA-F]{40}$' ||
  fail "EXPECTED_RELEASE_COMMIT must be a full 40-character hexadecimal commit"

command -v git >/dev/null 2>&1 || fail "git is required"
actual_commit=$(git rev-parse HEAD 2>/dev/null || true)
[ "$actual_commit" = "$expected_commit" ] ||
  fail "checked-out source does not match EXPECTED_RELEASE_COMMIT"
[ -z "$(git status --porcelain 2>/dev/null)" ] ||
  fail "repository worktree must be clean before staging operation"

printf '%s' "$project_name" | grep -Eq '^[a-z0-9][a-z0-9_-]*$' ||
  fail "STREAM_COMPOSE_PROJECT_NAME has an unsafe shape"

[ -f "$COMPOSE_FILE" ] || fail "$COMPOSE_FILE is missing"

case "$environment_file" in
  /*) environment_path=$environment_file ;;
  *) environment_path=$repository_root/$environment_file ;;
esac

environment_parent=$(CDPATH= cd -- "$(dirname -- "$environment_path")" 2>/dev/null && pwd) ||
  fail "production environment directory does not exist"
environment_path=$environment_parent/$(basename -- "$environment_path")

compose() {
  PRODUCTION_ENV_FILE=$environment_path docker compose \
    --project-name "$project_name" \
    --env-file "$environment_path" \
    -f "$COMPOSE_FILE" "$@"
}

validate_environment() {
  [ -f "$environment_path" ] || fail "production environment file does not exist"
  docker run --rm \
    --mount "type=bind,source=$repository_root,target=/workspace,readonly" \
    --mount "type=bind,source=$environment_path,target=/run/stream-production.env,readonly" \
    "$NODE_IMAGE" \
    node /workspace/scripts/validate-production-env.mjs /run/stream-production.env
}

require_mutation_approval() {
  [ "${APPROVED_STAGING_ACTION:-}" = "$action" ] ||
    fail "set APPROVED_STAGING_ACTION=$action for this mutating execution"
}

verify_running() {
  services=$(compose ps --status running --services)
  for service in postgres redis api web; do
    printf '%s\n' "$services" | grep -qx "$service" || fail "$service is not running"
  done

  migration_id=$(compose ps -aq migrate)
  [ -n "$migration_id" ] || fail "migration container is missing"
  migration_exit=$(docker inspect --format '{{.State.ExitCode}}' "$migration_id")
  [ "$migration_exit" = "0" ] || fail "migration container did not exit successfully"

  published_gateway=$(compose port web 80)
  case "$published_gateway" in
    127.0.0.1:*) ;;
    *) fail "web gateway is not bound exclusively to IPv4 localhost" ;;
  esac

  compose exec -T web wget -qO- http://127.0.0.1/healthz >/dev/null
  readiness=$(compose exec -T api wget -qO- http://127.0.0.1:3001/ready)
  printf '%s' "$readiness" | grep -q '"status":"ready"' || fail "API is not ready"

  metrics=$(compose exec -T api node -e \
    "const r=await fetch('http://127.0.0.1:3001/internal/metrics',{headers:{authorization:'Bearer '+process.env.METRICS_TOKEN}});const b=await r.text();if(r.status!==200||!b.includes('stream_http_requests_total'))process.exit(1);console.log('private-metrics-ok')")
  [ "$metrics" = "private-metrics-ok" ] || fail "private metrics verification failed"

  printf 'Private staging verification passed for source %s.\n' "$actual_commit"
}

case "$action" in
  preflight)
    sh deploy/verify-host-prerequisites.sh
    ;;
  plan)
    sh deploy/verify-host-prerequisites.sh
    validate_environment
    compose config --quiet
    printf 'Private staging plan passed for source %s; no service was started.\n' "$actual_commit"
    ;;
  status)
    compose ps
    ;;
  verify)
    validate_environment
    compose config --quiet
    verify_running
    ;;
  start)
    require_mutation_approval
    sh deploy/verify-host-prerequisites.sh
    validate_environment
    compose config --quiet
    compose build
    compose up -d
    verify_running
    ;;
  stop)
    require_mutation_approval
    compose down
    printf 'Private staging services stopped; named data volumes were preserved.\n'
    ;;
esac
