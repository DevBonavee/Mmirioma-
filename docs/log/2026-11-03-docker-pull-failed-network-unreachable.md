# 2026-11-03: `docker pull python:3.13-alpine` failed with "network is unreachable"

- **Area:** tooling
- **Author:** nnamdi-security + agent
- **Symptom:** `docker: failed to copy: httpReadSeeker: failed open: ... dial tcp [2600:9000:...]:443: connect: network is unreachable` while pulling `python:3.13-alpine`. Pulling `ghcr.io/project-osrm/osrm-backend:v6.0.0` at the same time worked.
- **Cause:** not proven. The failing address was an IPv6 one for Docker Hub's CDN, and this machine appears to have no IPv6 route.
- **Fix / workaround:** did not need the image: the measurement script's Python probe was run with the host's `python3` against the OSRM container's address on the Docker network. If an image from Docker Hub fails the same way, retry, or disable IPv6 for the Docker daemon.
- **Status:** workaround
- **Refs:** #384.
