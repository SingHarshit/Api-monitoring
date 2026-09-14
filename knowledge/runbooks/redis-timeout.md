---
type: runbook
service: infrastructure
---

# Redis Timeout

## Symptoms

- Redis requests timeout
- API latency increases
- Queue processing becomes slow
- Cache operations fail

## Possible Causes

- Redis CPU saturation
- Redis memory pressure
- Network latency
- Too many concurrent connections
- Redis failover

## Investigation

1. Check Redis CPU.
2. Check Redis memory usage.
3. Check connected clients.
4. Check Redis latency.
5. Check network connectivity.
6. Check Redis logs.

## Resolution

Reduce Redis load and remove unhealthy connections.

If Redis is unavailable, temporarily bypass non-critical cache operations where possible.