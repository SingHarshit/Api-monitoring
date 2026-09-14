---
type: runbook
service: authentication
---

# Authentication Failure

## Symptoms

- Increased HTTP 401 responses
- Increased HTTP 403 responses
- Login failures
- Token validation failures

## Possible Causes

- Invalid credentials
- Expired tokens
- Authentication service outage
- JWT configuration changes
- Identity provider failure

## Investigation

1. Check authentication service health.
2. Check token expiration configuration.
3. Check identity provider status.
4. Check recent authentication configuration changes.
5. Inspect authentication logs.

## Resolution

Restore authentication service availability or revert invalid authentication configuration changes.