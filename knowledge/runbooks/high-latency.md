---
type: runbook
service: payment
---

# High API Latency

## Symptoms

- P95 latency increases
- Requests take longer than normal
- Timeout rate increases
- User-facing response times degrade

## Possible Causes

- Database slowdown
- External API latency
- CPU saturation
- Memory pressure
- Network problems
- Lock contention

## Investigation

1. Compare current latency against baseline.
2. Check database latency.
3. Check downstream API latency.
4. Check CPU and memory.
5. Check recent deployments.
6. Check timeout rates.

## Resolution

Identify the slow dependency first.

If the problem started immediately after a deployment, consider rolling back the deployment.