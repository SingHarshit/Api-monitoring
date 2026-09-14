---
type: incident
service: payment
---

# Incident 001

## Summary

Payment API experienced high latency and database timeout errors.

## Symptoms

- P95 latency increased from 300ms to 2400ms.
- HTTP 504 responses increased.
- Database connection pool utilization reached 100%.

## Root Cause

The database connection pool was exhausted because several long-running queries consumed available connections.

## Resolution

Long-running queries were terminated and the connection pool was recovered.

## Prevention

Slow query monitoring and connection pool alerts were added.