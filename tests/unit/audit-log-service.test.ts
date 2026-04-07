import { describe, expect, it } from 'vitest';

import { recordAuditLog } from '../../src/server/services/audit-log-service';
import type { DataStore } from '../../src/server/types';

function createEmptyStore(): DataStore {
  return {
    students: [],
    campaigns: [],
    timeSlots: [],
    clubs: [],
    accessCodes: [],
    reservations: [],
    submissions: [],
    placements: [],
    exceptions: [],
    history: [],
    documents: [],
    accessExports: [],
    auditLogs: [],
    metrics: {
      campaign_identification_failures_total: 0,
      campaign_last_seat_race_total: 0,
      allocation_repeat_override_total: 0,
      pdf_generation_failures_total: 0,
    },
    lastStudentImportReport: null,
  };
}

describe('audit-log-service', () => {
  it('keeps the full audit trail instead of truncating older events', () => {
    const store = createEmptyStore();

    for (let index = 0; index < 205; index += 1) {
      recordAuditLog(store, {
        entityType: 'campaign',
        entityId: `campaign-${index}`,
        action: `event-${index}`,
        actor: 'admin',
      });
    }

    expect(store.auditLogs).toHaveLength(205);
    expect(store.auditLogs[0]?.action).toBe('event-204');
    expect(store.auditLogs.at(-1)?.action).toBe('event-0');
  });
});
