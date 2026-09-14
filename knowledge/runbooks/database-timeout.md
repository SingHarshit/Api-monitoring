---
type: runbook
service: payment
---

# Database Timeout

## Symptoms

Database timeout incidents usually produce:

- High API latency
- HTTP 504 responses
- Request timeouts
- Increased database connection usage

## Possible Causes

Common causes include:

- Database overload
- Connection pool exhaustion
- Long-running queries
- Database locks
- Network connectivity problems

## Investigation

1. Check database CPU and memory.
2. Check active database connections.
3. Check connection pool utilization.
4. Identify long-running queries.
5. Check for database locks.
6. Verify database network connectivity.

## Resolution

If the connection pool is exhausted:

1. Stop unnecessary database connections.
2. Identify long-running queries.
3. Terminate unhealthy connections if appropriate.
4. Increase pool capacity only after identifying the root cause.

## Prevention

- Add database connection monitoring.
- Configure query timeouts.
- Monitor connection pool utilization.
- Optimize slow queries.