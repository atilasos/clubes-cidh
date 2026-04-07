# Worker-2 test lane notes

This lane is reserving `tests/**` for the PRD and test-spec coverage added on 2026-04-07.

Current scope:
- `tests/fixtures/campaign-fixtures.ts` — reusable datasets for domain and race-condition coverage.
- `tests/unit/*.test.ts` — executable service-level expectations for capacity, eligibility, enrolment, allocation, archive, and security helpers.
- `tests/integration/*.test.ts` / `tests/e2e/*.test.ts` — scenario placeholders to be turned live once the shared app/bootstrap exists.

Shared bootstrap (`package.json`, test runner config, tsconfig, Next app wiring) was intentionally not modified from this lane while the workspace is still greenfield, to avoid conflicting with the platform/build lane.
