# Test coverage notes

Current scope:
- `tests/fixtures/campaign-fixtures.ts` — reusable datasets for domain and race-condition coverage.
- `tests/unit/*.test.ts` — executable service-level expectations for capacity, eligibility, enrolment, allocation, archive, and security helpers.
- `tests/integration/campaign-workflows.test.ts` — end-to-end workflow simulation over the live domain services, including import, campaign preparation, access export, allocation, exception handling, and finalization.
- `tests/e2e/campaign-lifecycle.test.ts` — full lifecycle simulation from public identification through submission, allocation, and document generation.

The browser-facing flows are additionally verified by manual QA against the running Next.js app.
