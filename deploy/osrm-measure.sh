#!/usr/bin/env bash
# Measure OSRM on the REAL VPS and say PASS or FAIL (docs/architecture/maps.md
# option R1, #384). Run it from the repository folder on the server, after the
# routing files are copied and OSRM is started:
#
#   deploy/prod.sh up -d osrm
#   deploy/osrm-measure.sh
#
# Usage:
#   deploy/osrm-measure.sh [--from LON,LAT] [--to LON,LAT] [--requests N]
#
# Pass line (maps.md): OSRM uses under 1.5 GiB (OSRM_LIMIT_MIB, default 1536) after
# a burst of requests, is healthy and was not killed, answers a route from inside
# the stack (from the API container, over the internal network), and the API is
# still healthy. Exit code 0 on PASS, 1 on FAIL.
#
# The default points are two roads in Enugu taken from OpenStreetMap: Ogui Road and
# Presidential Road. The road/straight-line ratio printed is only a plausibility
# hint for the data: straight-line distance is NEVER used for pricing (FR-022).
# Paste the results block into docs/deployment/hostinger.md, section "OSRM".
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
limit_mib="${OSRM_LIMIT_MIB:-1536}"
from="7.5095852,6.4586357" # Ogui Road, Enugu (lon,lat)
to="7.5193599,6.4370208"   # Presidential Road, Enugu (lon,lat)
requests=200

usage() { sed -n '2,19p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from) [[ $# -ge 2 ]] || { echo "--from needs LON,LAT" >&2; exit 2; }; from="$2"; shift 2 ;;
    --to) [[ $# -ge 2 ]] || { echo "--to needs LON,LAT" >&2; exit 2; }; to="$2"; shift 2 ;;
    --requests) [[ $# -ge 2 ]] || { echo "--requests needs a number" >&2; exit 2; }; requests="$2"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown option: $1 (see --help)" >&2; exit 2 ;;
  esac
done

point='^-?[0-9]+(\.[0-9]+)?,-?[0-9]+(\.[0-9]+)?$'
[[ "$from" =~ $point && "$to" =~ $point ]] || { echo "Points must look like 7.5096,6.4586 (lon,lat)." >&2; exit 2; }
[[ "$requests" =~ ^[0-9]+$ && "$requests" -ge 1 ]] || { echo "--requests must be a whole number, 1 or more." >&2; exit 2; }

export COMPOSE_PROFILES=routing
prod() { "$root/deploy/prod.sh" "$@"; }

# "412.3MiB" or "1.2GiB" (docker stats) to whole MiB.
to_mib() {
  awk -v v="$1" 'BEGIN {
    n = v + 0
    if (v ~ /GiB/) n *= 1024; else if (v ~ /KiB/) n /= 1024; else if (v ~ /MiB/) n *= 1; else n /= 1048576
    printf "%d", n + 0.5
  }'
}
osrm_mib() {
  to_mib "$(docker stats --no-stream --format '{{.MemUsage}}' "$1" | awk -F' / ' '{print $1}')"
}

osrm_id="$(prod ps -q osrm || true)"
if [[ -z "$osrm_id" ]]; then
  echo "OSRM is not running. Start it: deploy/prod.sh up -d osrm" >&2
  exit 1
fi
api_id="$(prod ps -q api || true)"

fails=()
host_available_before="$(free -m | awk '/^Mem:/ {print $7}')"
mem_before="$(osrm_mib "$osrm_id")"

# Route, a table and a burst of routes, all from inside the stack: the API container
# calls http://osrm:5000 over the internal network, as the pricing code will.
# shellcheck disable=SC2016  # the Python is meant to reach the container as it is
probe='
import json, sys, time, urllib.request
src, dst, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
base = "http://osrm:5000"
def get(path):
    with urllib.request.urlopen(base + path, timeout=10) as r:
        return json.load(r)
route = "/route/v1/driving/%s;%s?overview=false" % (src, dst)
d = get(route)
leg = d["routes"][0]
print("ROUTE", d["code"], round(leg["distance"]), round(leg["duration"]),
      round(d["waypoints"][0]["distance"]), round(d["waypoints"][1]["distance"]))
t = get("/table/v1/driving/%s;%s;%s?sources=0&annotations=distance" % (src, dst, src))
print("TABLE", t["code"], len(t["distances"][0]))
times, errors = [], 0
for _ in range(n):
    start = time.perf_counter()
    try:
        get(route)
    except Exception:
        errors += 1
    times.append((time.perf_counter() - start) * 1000)
print("LOAD", n, round(sum(times) / n, 1), round(max(times), 1), errors)
'
if ! probe_out="$(prod exec -T api python -c "$probe" "$from" "$to" "$requests" 2>&1)"; then
  echo "$probe_out" >&2
  fails+=("the route request from the API container failed")
  probe_out=""
fi
route_line="$(grep '^ROUTE ' <<<"$probe_out" || true)"
table_line="$(grep '^TABLE ' <<<"$probe_out" || true)"
load_line="$(grep '^LOAD ' <<<"$probe_out" || true)"

read -r _ route_code route_m route_s snap_from snap_to <<<"${route_line:-ROUTE missing 0 0 0 0}"
read -r _ table_code table_n <<<"${table_line:-TABLE missing 0}"
read -r _ load_n load_mean load_max load_errors <<<"${load_line:-LOAD 0 0 0 1}"
[[ "$route_code" == "Ok" && "$route_m" -gt 0 ]] || fails+=("no route between the two points (code $route_code)")
[[ "$table_code" == "Ok" ]] || fails+=("the table request did not answer Ok")
[[ "$load_errors" -eq 0 ]] || fails+=("$load_errors of $load_n requests failed")

mem_after="$(osrm_mib "$osrm_id")"
mem_peak="$mem_before"; [[ "$mem_after" -gt "$mem_peak" ]] && mem_peak="$mem_after"
cgroup_peak_mib="n/a"
if peak_bytes="$(docker exec "$osrm_id" cat /sys/fs/cgroup/memory.peak 2>/dev/null)"; then
  cgroup_peak_mib=$((peak_bytes / 1048576))
fi
[[ "$mem_peak" -lt "$limit_mib" ]] || fails+=("OSRM uses ${mem_peak} MiB, not under ${limit_mib} MiB")

osrm_health="$(docker inspect -f '{{.State.Health.Status}}' "$osrm_id")"
osrm_oom="$(docker inspect -f '{{.State.OOMKilled}}' "$osrm_id")"
osrm_restarts="$(docker inspect -f '{{.RestartCount}}' "$osrm_id")"
[[ "$osrm_health" == "healthy" ]] || fails+=("OSRM health is $osrm_health (is the Enugu map loaded?)")
[[ "$osrm_oom" == "false" && "$osrm_restarts" -eq 0 ]] || fails+=("OSRM was killed or restarted (oom=$osrm_oom, restarts=$osrm_restarts)")

api_health="missing"
api_ready="no answer"
if [[ -n "$api_id" ]]; then
  api_health="$(docker inspect -f '{{.State.Health.Status}}' "$api_id")"
  api_ready="$(prod exec -T api python -c \
    "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health/ready', timeout=5).status)" 2>/dev/null || echo 'no answer')"
fi
[[ "$api_health" == "healthy" && "$api_ready" == "200" ]] || fails+=("the API is not healthy (container $api_health, ready check: $api_ready)")

host_available_after="$(free -m | awk '/^Mem:/ {print $7}')"
swap_used="$(free -m | awk '/^Swap:/ {print $3}')"

# Plausibility only (never used for pricing): the great-circle distance in metres.
straight_m="$(awk -v a="$from" -v b="$to" 'BEGIN {
  split(a, p, ","); split(b, q, ",")
  r = 6371000; d2r = 3.14159265358979 / 180
  dlat = (q[2] - p[2]) * d2r; dlon = (q[1] - p[1]) * d2r
  h = sin(dlat / 2) ^ 2 + cos(p[2] * d2r) * cos(q[2] * d2r) * sin(dlon / 2) ^ 2
  printf "%d", 2 * r * atan2(sqrt(h), sqrt(1 - h))
}')"
ratio="n/a"
[[ "$straight_m" -gt 0 && "$route_m" -gt 0 ]] && ratio="$(awk -v r="$route_m" -v s="$straight_m" 'BEGIN { printf "%.2f", r / s }')"

verdict="PASS"
[[ ${#fails[@]} -eq 0 ]] || verdict="FAIL"

cat <<EOF

OSRM measurement ($(date -u +%Y-%m-%d), UTC)
  verdict:                   $verdict (pass line: OSRM under ${limit_mib} MiB, healthy, API unaffected)
  OSRM memory (docker stats): ${mem_before} MiB before, ${mem_after} MiB after ${load_n} requests
  OSRM memory peak (cgroup): ${cgroup_peak_mib} MiB (includes file cache the kernel can drop)
  host available memory:     ${host_available_before} MiB before, ${host_available_after} MiB after; swap used ${swap_used} MiB
  OSRM container:            health $osrm_health, oom-killed $osrm_oom, restarts $osrm_restarts
  API container:             health $api_health, /health/ready $api_ready
  route from the API:        ${route_m} m, ${route_s} s between $from and $to
  snap distances:            ${snap_from} m and ${snap_to} m (how far each point was moved onto a road)
  road / straight-line:      $ratio (straight line ${straight_m} m; plausibility hint only)
  table request:             $table_code, ${table_n} distances
  load:                      ${load_n} routes, mean ${load_mean} ms, max ${load_max} ms, ${load_errors} errors

EOF
if [[ "$verdict" == "FAIL" ]]; then
  printf 'Why it failed:\n'
  printf '  - %s\n' "${fails[@]}"
  printf '\nDo not deploy OSRM. Stop it (deploy/prod.sh stop osrm), record these numbers, and keep zone rates.\n'
  exit 1
fi
echo "Passed. Record the block above in docs/deployment/hostinger.md, section \"OSRM\"."
