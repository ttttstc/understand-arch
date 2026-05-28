# Risks And Debt

## Order creation has no visible validation

Mitigation: add input validation and idempotency behavior before using this path as a production order flow.

## No sample tests are present

Recommendation: add a unit test around `createOrder` before expanding the sample.
