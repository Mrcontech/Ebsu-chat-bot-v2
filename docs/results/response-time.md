# Response time

Measured with `npm run benchmark` on 2026-10-10: the 30 held-out test questions, 10 rounds (300 requests), sent one at a time to the running app.
Each time covers the whole request: HTTP, the database check for knowledge-base changes, reading the thresholds, and matching.

Machine: Intel(R) Xeon(R) Processor @ 2.10GHz, 4 cores, 16 GB RAM, Node.js v22.22.0.

| Measure | Time |
|---|---|
| Median | 3.6 ms |
| Mean | 3.8 ms |
| 95th percentile | 5.3 ms |
| Slowest | 7.2 ms |
