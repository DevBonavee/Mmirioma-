# 2026-11-03: OSRM files built in Docker came out root-owned, one of them readable by root only

- **Area:** tooling
- **Author:** nnamdi-security + agent
- **Symptom:** after `deploy/osrm-build.sh` with a test extract, `ls -l` showed every output file owned by `root`, and `nigeria-latest.osrm.fileIndex` with mode `-rwx------`. Copied to the server as another user, that file would be unreadable by a container that runs without root capabilities (no `CAP_DAC_OVERRIDE`).
- **Cause:** the OSRM tools run as root inside the container, and `osrm-extract` creates `fileIndex` as 0700.
- **Fix / workaround:** the script ends with a short container step that runs `chmod -R a+rX` and `chown` to the calling user, and the compose service runs as user 65534 so it only needs read access. Tested: the files are owned by the caller and world-readable after a build.
- **Status:** resolved
- **Refs:** #384, `deploy/osrm-build.sh`, `compose.production.yaml`.
