# 2026-11-03: OSRM's v26.x releases have no container image at those tags

- **Area:** tooling
- **Author:** nnamdi-security + agent
- **Symptom:** the latest OSRM release is `v26.11.0` (1 Nov 2026), but `docker manifest inspect ghcr.io/project-osrm/osrm-backend:v26.11.0` found nothing. The same for `26.11.0`, `v26.10.0`, `v26.9.0`, `v26.7.3` and `v26.6.5`.
- **Cause:** the project moved to calendar-version releases, but the registry's tags still stop at `v6.0.0` (and `v5.27.1`, `latest`). Not investigated further: the publishing workflow may use another tag form, or may not push images for these releases.
- **Fix / workaround:** pin `ghcr.io/project-osrm/osrm-backend:v6.0.0`, the newest tag that exists, and check that the commands the stack uses are there (`osrm-extract`, `osrm-partition`, `osrm-customize`, `osrm-routed`, `/opt/car.lua`). Revisit when a newer image appears; rebuild the routing files with the version you run.
- **Status:** workaround
- **Refs:** #384, `compose.production.yaml`, `docs/deployment/hostinger.md` section 16.
