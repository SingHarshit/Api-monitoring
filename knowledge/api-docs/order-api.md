---
type: api-doc
service: order
---

# Order API

## POST /orders

Creates an order.

## GET /orders/:id

Returns an order.

## Dependencies

The Order API depends on:

- PostgreSQL
- Redis
- Payment API

## Failure Characteristics

Payment API failures may cause order creation failures.

Database problems may cause increased latency and timeout errors.