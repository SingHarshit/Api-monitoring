---
type: api-doc
service: payment
---

# Payment API

## POST /payments

Creates a payment.

## GET /payments/:id

Returns payment details.

## Dependencies

The Payment API depends on:

- PostgreSQL
- Redis
- Authentication service

## Failure Characteristics

Database failures may cause:

- Increased latency
- HTTP 500 responses
- HTTP 504 responses
- Request timeouts

Redis failures may cause:

- Increased latency
- Cache failures
- Queue delays