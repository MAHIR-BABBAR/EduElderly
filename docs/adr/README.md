# Architecture Decision Records

Short records of the decisions that shaped EduElderly, in the order they were made. Each one states the context, the decision, and what it cost. New decisions get the next number; superseded ones are kept and marked.

| # | Decision | Status |
|---|---|---|
| [0001](./0001-gateway-trust-headers.md) | Gateway trust headers instead of a service mesh | accepted |
| [0002](./0002-database-per-service.md) | One MongoDB database per service | accepted |
| [0003](./0003-enrollment-owns-certificate-eligibility.md) | Enrollment service owns certificate eligibility | accepted |
| [0004](./0004-bullmq-for-side-effects.md) | BullMQ for email and PDF side effects, inline fallback | accepted |
| [0005](./0005-server-side-accessibility-preferences.md) | Accessibility preferences stored on the user profile | accepted |
