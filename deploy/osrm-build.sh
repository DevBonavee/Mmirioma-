#!/usr/bin/env bash
# Build the OSRM routing files for Nigeria. Run it on a DEVELOPER MACHINE, not on
# the VPS: building needs several times more memory than serving, and the 4 GB
# server cannot spare it (docs/architecture/maps.md option R1, #384).
#
# Usage:
#   deploy/osrm-build.sh                       # download Nigeria, build into ./osrm-data
#   deploy/osrm-build.sh --out /path/to/dir    # build somewhere else
#   deploy/osrm-build.sh --pbf extract.osm.pbf # use a file you already have (no download)
#   deploy/osrm-build.sh --memory 6g           # cap Docker's memory, to see if it fits
#   deploy/osrm-build.sh --keep-pbf            # keep the downloaded extract
#
# It runs the pinned OSRM image (the one in compose.production.yaml), so the files
# match the server's version: `osrm-extract` with the car profile, then
# `osrm-partition` and `osrm-customize` for the MLD algorithm the server runs.
# It writes BUILD_INFO.txt next to the files with the dates, versions, sizes and
# timings, to paste into docs/deployment/hostinger.md.
#
# Copy the folder to the VPS afterwards (see the runbook), for example:
#   rsync -a --delete ./osrm-data/ deploy@<vps>:/srv/mmirioma/osrm-data/
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
extract_url="https://download.geofabrik.de/africa/nigeria-latest.osm.pbf"
name="nigeria-latest"

out="$root/osrm-data"
pbf=""
memory=""
keep_pbf=0

usage() { sed -n '2,19p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) [[ $# -ge 2 ]] || { echo "--out needs a folder" >&2; exit 2; }; out="$2"; shift 2 ;;
    --pbf) [[ $# -ge 2 ]] || { echo "--pbf needs a file" >&2; exit 2; }; pbf="$2"; shift 2 ;;
    --memory) [[ $# -ge 2 ]] || { echo "--memory needs a size, e.g. 6g" >&2; exit 2; }; memory="$2"; shift 2 ;;
    --keep-pbf) keep_pbf=1; shift ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown option: $1 (see --help)" >&2; exit 2 ;;
  esac
done

# The server has a .env.production; a developer machine does not. Building there
# can starve the API and the database, so refuse unless it is meant.
if [[ -f "$root/.env.production" && -z "${OSRM_BUILD_ON_SERVER:-}" ]]; then
  echo "This looks like the server (.env.production exists). Build on another machine." >&2
  echo "To build here anyway: OSRM_BUILD_ON_SERVER=1 $0 ..." >&2
  exit 1
fi

# One place for the version: the compose file.
image="$(grep -o 'ghcr.io/project-osrm/osrm-backend:[A-Za-z0-9._-]*' "$root/compose.production.yaml" | head -1)"
[[ -n "$image" ]] || { echo "No OSRM image found in compose.production.yaml" >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker is required." >&2; exit 1; }

mkdir -p "$out"
out="$(cd "$out" && pwd)"
work="$out/.work"
mkdir -p "$work"

started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
downloaded=0
if [[ -z "$pbf" ]]; then
  echo "Downloading $extract_url ..."
  command -v curl >/dev/null || { echo "curl is required to download." >&2; exit 1; }
  curl -fL --retry 3 -o "$work/$name.osm.pbf" "$extract_url"
  curl -fsSL -o "$work/$name.osm.pbf.md5" "$extract_url.md5"
  # Geofabrik's md5 file names the file; check against the file we saved.
  expected="$(awk '{print $1}' "$work/$name.osm.pbf.md5")"
  actual="$(md5sum "$work/$name.osm.pbf" | awk '{print $1}')"
  [[ "$expected" == "$actual" ]] || { echo "Checksum mismatch: expected $expected, got $actual" >&2; exit 1; }
  echo "Checksum OK ($actual)."
  downloaded=1
else
  [[ -f "$pbf" ]] || { echo "No such file: $pbf" >&2; exit 1; }
  cp "$pbf" "$work/$name.osm.pbf"
  actual="$(md5sum "$work/$name.osm.pbf" | awk '{print $1}')"
fi
pbf_bytes="$(stat -c %s "$work/$name.osm.pbf")"

docker_run() {
  # MSYS_NO_PATHCONV stops Git Bash on Windows from rewriting /data and /opt/car.lua
  # into Windows paths; it does nothing on Linux. The memory flag is two words, or none.
  MSYS_NO_PATHCONV=1 docker run --rm ${memory:+--memory "$memory"} -v "$work:/data" "$image" "$@"
}

timed() { # label, command...
  local label="$1"; shift
  local t0=$SECONDS
  echo "== $label"
  "$@"
  echo "   $label took $((SECONDS - t0)) s"
  eval "t_${label//[^a-z]/_}=$((SECONDS - t0))"
}

timed extract docker_run osrm-extract -p /opt/car.lua "/data/$name.osm.pbf"
timed partition docker_run osrm-partition "/data/$name.osrm"
timed customize docker_run osrm-customize "/data/$name.osrm"

# Docker ran as root, so the files are root-owned and one of them (fileIndex) is
# readable by its owner only. Make them yours and readable by everyone, so they can
# be copied to the server and read there by the container's non-root user.
# (chown may fail on Windows file shares; the chmod is what matters.)
MSYS_NO_PATHCONV=1 docker run --rm --entrypoint sh -v "$work:/data" "$image" -c \
  "chmod -R a+rX /data && chown -R $(id -u):$(id -g) /data || true"

# Keep only what the server needs: the .osrm files. Not the extract or the md5.
find "$out" -maxdepth 1 -type f -name "$name.osrm*" -delete
mv "$work/$name".osrm* "$out/"
if [[ "$keep_pbf" -eq 1 ]]; then mv "$work/$name.osm.pbf" "$out/"; fi
rm -rf "$work"

osrm_version="$(docker run --rm --entrypoint osrm-routed "$image" --version 2>&1 | head -1 || true)"
data_bytes="$(du -sb "$out" | awk '{print $1}')"
{
  echo "OSRM routing files for Nigeria"
  echo "built (UTC):        $started"
  echo "image:              $image"
  echo "osrm-routed:        $osrm_version"
  echo "profile/algorithm:  car / MLD"
  echo "extract:            ${extract_url##*/} (downloaded=$downloaded, md5 $actual, $pbf_bytes bytes)"
  echo "build memory cap:   ${memory:-none}"
  echo "seconds:            extract ${t_extract:-?}, partition ${t_partition:-?}, customize ${t_customize:-?}"
  echo "routing files:      $data_bytes bytes in $out"
} | tee "$out/BUILD_INFO.txt"

echo
echo "Done. Copy $out to the server's OSRM_DATA_DIR (see docs/deployment/hostinger.md, \"OSRM\")."
