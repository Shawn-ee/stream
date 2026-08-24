#!/bin/sh
set -u

# Read-only admission check for an owner-approved private Linux staging host.
# It does not install packages, change firewall rules, read project secrets, or start containers.

MIN_CPUS=${MIN_CPUS:-2}
MIN_MEMORY_MIB=${MIN_MEMORY_MIB:-4096}
MIN_DISK_GIB=${MIN_DISK_GIB:-20}
APP_PORT=${APP_PORT:-8080}
failures=0
warnings=0

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; failures=$((failures + 1)); }
warn() { printf 'WARN  %s\n' "$1"; warnings=$((warnings + 1)); }

case "$(uname -s 2>/dev/null || true)" in
  Linux) pass "Linux host detected" ;;
  *) fail "This deployment package requires a Linux host" ;;
esac

architecture=$(uname -m 2>/dev/null || true)
case "$architecture" in
  x86_64|amd64|aarch64|arm64) pass "Supported architecture: $architecture" ;;
  *) fail "Unsupported architecture: ${architecture:-unknown}" ;;
esac

cpu_count=$(getconf _NPROCESSORS_ONLN 2>/dev/null || printf '0')
case "$cpu_count" in *[!0-9]*|'') cpu_count=0 ;; esac
if [ "$cpu_count" -ge "$MIN_CPUS" ]; then
  pass "CPU capacity: $cpu_count logical CPUs (minimum $MIN_CPUS)"
else
  fail "CPU capacity: $cpu_count logical CPUs; minimum is $MIN_CPUS"
fi

memory_kib=$(awk '/^MemTotal:/ { print $2; exit }' /proc/meminfo 2>/dev/null || printf '0')
case "$memory_kib" in *[!0-9]*|'') memory_kib=0 ;; esac
memory_mib=$((memory_kib / 1024))
if [ "$memory_mib" -ge "$MIN_MEMORY_MIB" ]; then
  pass "Memory capacity: ${memory_mib} MiB (minimum ${MIN_MEMORY_MIB} MiB)"
else
  fail "Memory capacity: ${memory_mib} MiB; minimum is ${MIN_MEMORY_MIB} MiB"
fi

disk_kib=$(df -Pk . 2>/dev/null | awk 'NR == 2 { print $4 }')
case "$disk_kib" in *[!0-9]*|'') disk_kib=0 ;; esac
disk_gib=$((disk_kib / 1024 / 1024))
if [ "$disk_gib" -ge "$MIN_DISK_GIB" ]; then
  pass "Free workspace disk: ${disk_gib} GiB (minimum ${MIN_DISK_GIB} GiB)"
else
  fail "Free workspace disk: ${disk_gib} GiB; minimum is ${MIN_DISK_GIB} GiB"
fi

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker is not installed or is not on PATH"
else
  docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)
  if [ -z "$docker_version" ]; then
    fail "Docker daemon is unavailable to the deployment operator"
  else
    docker_major=$(printf '%s' "$docker_version" | awk -F. '{ print $1 + 0 }')
    if [ "$docker_major" -ge 24 ]; then
      pass "Docker server version: $docker_version"
    else
      fail "Docker server $docker_version is older than required major version 24"
    fi
  fi

  compose_version=$(docker compose version --short 2>/dev/null || true)
  if [ -z "$compose_version" ]; then
    fail "Docker Compose v2 plugin is unavailable"
  else
    compose_major=$(printf '%s' "$compose_version" | sed 's/^v//' | awk -F. '{ print $1 + 0 }')
    compose_minor=$(printf '%s' "$compose_version" | sed 's/^v//' | awk -F. '{ print $2 + 0 }')
    if [ "$compose_major" -gt 2 ] || { [ "$compose_major" -eq 2 ] && [ "$compose_minor" -ge 20 ]; }; then
      pass "Docker Compose version: $compose_version"
    else
      fail "Docker Compose $compose_version is older than required version 2.20"
    fi
  fi
fi

case "$APP_PORT" in
  *[!0-9]*|'') fail "APP_PORT must be numeric" ;;
  *)
    if [ "$APP_PORT" -lt 1 ] || [ "$APP_PORT" -gt 65535 ]; then
      fail "APP_PORT must be between 1 and 65535"
    elif command -v ss >/dev/null 2>&1; then
      if ss -ltn 2>/dev/null | grep -Eq "[:.]${APP_PORT}[[:space:]]"; then
        fail "Private gateway port $APP_PORT is already in use"
      else
        pass "Private gateway port $APP_PORT is available"
      fi
    else
      warn "Could not check port $APP_PORT because the ss utility is unavailable"
    fi
    ;;
esac

if command -v timedatectl >/dev/null 2>&1; then
  clock_sync=$(timedatectl show -p NTPSynchronized --value 2>/dev/null || true)
  if [ "$clock_sync" = "yes" ]; then
    pass "System clock reports synchronized"
  else
    warn "System clock synchronization could not be confirmed"
  fi
else
  warn "timedatectl is unavailable; confirm clock synchronization operationally"
fi

printf '\nHost preflight summary: %s failure(s), %s warning(s).\n' "$failures" "$warnings"
if [ "$failures" -ne 0 ]; then
  exit 1
fi

printf 'Host meets the repository admission minimums. Deployment still requires owner approval.\n'
