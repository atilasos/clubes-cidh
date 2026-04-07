import { describe, it } from 'vitest';

describe('campaign workflows integration', () => {
  it.todo('imports valid students and returns a rejection report for invalid or duplicate rows');
  it.todo('creates a campaign with slots, clubs, reservations, and an access export package');
  it.todo('requires a valid identifier plus campaign access code to identify a student publicly');
  it.todo('consumes the last available seat transactionally without oversubscription');
  it.todo('generates a dry-run allocation preview without persisting final placements');
  it.todo('persists final placements and audit logs when allocation is committed');
  it.todo('freezes finalized placements into snapshots used by PDF generation');
  it.todo('archives first semester history for the next campaign and locks second semester snapshots');
});
