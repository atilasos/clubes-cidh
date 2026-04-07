import { describe, expect, it } from 'vitest';

import { firstSemesterHistory } from '../fixtures/campaign-fixtures';
import { archiveCampaign } from '../../src/server/services/archive-service';

describe('archive-service', () => {
  it('keeps first semester placements available for second semester eligibility and allocation', () => {
    const archiveResult = archiveCampaign({
      campaignId: 'campaign-s1',
      semester: 'S1',
      schoolYear: '2025/2026',
      finalPlacements: firstSemesterHistory,
      priorArchive: null,
    });

    expect(archiveResult).toMatchObject({
      visibility: 'active-for-next-semester',
      nextSemesterSeedHistory: firstSemesterHistory,
    });
  });

  it('freezes second semester archives into read-only historical snapshots', () => {
    const archiveResult = archiveCampaign({
      campaignId: 'campaign-s2',
      semester: 'S2',
      schoolYear: '2025/2026',
      finalPlacements: firstSemesterHistory,
      priorArchive: { visibility: 'active-for-next-semester' },
    });

    expect(archiveResult).toMatchObject({
      visibility: 'read-only',
      nextSemesterSeedHistory: [],
      snapshotLocked: true,
    });
  });
});
