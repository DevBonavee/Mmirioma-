# 2026-11-03: OSRM answers "Ok" for a point on the other side of the world

- **Area:** backend
- **Author:** nnamdi-security + agent
- **Symptom:** while testing the `osrm` service with a Monaco extract, `GET /nearest/v1/driving/7.4951,6.4584` (Enugu) returned HTTP 200 and `{"code":"Ok", ... "name":"Avenue Marquet", "distance":4127982.533}`. The first health check, which only looked for HTTP 200, reported the container healthy although it held the wrong country's data.
- **Cause:** OSRM snaps any coordinate to the nearest road in the data it has, however far away. It does not return `NoSegment` for a distant point. The only warning is `waypoints[].distance`, the snap distance in metres.
- **Fix / workaround:** the compose health check reads that distance for a point on Ogui Road, Enugu, and is healthy only if it is under 1000 m (tested: unhealthy against Monaco data, healthy for a Monaco point). `deploy/osrm-measure.sh` prints the snap distances. For the pricing code (#385): a quote must check the snap distance of the delivery pin and the source and fall back to zone rates when it is large; the agreed contract leaves a threshold out of version 1, so this needs a contract change before road pricing is switched on.
- **Status:** workaround
- **Refs:** #384, #385, `docs/deployment/hostinger.md` section 16, `compose.production.yaml`.
