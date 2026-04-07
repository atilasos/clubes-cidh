import { describe, expect, it } from 'vitest';

import { closeCampaign, commitCampaignAllocation, finalizeCampaign } from '../../src/server/services/campaign-operations-service';
import { createCampaign } from '../../src/server/services/campaign-service';
import {
  getStudentEnrollmentContextInStore,
  identifyStudentForCampaignInStore,
  submitEnrollmentChoiceInStore,
} from '../../src/server/services/enrollment-service';
import { importStudents } from '../../src/server/services/student-import-service';
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

describe('campaign lifecycle e2e', () => {
  it('runs the campaign flow from import through public submission, allocation, and finalization', async () => {
    const store = createEmptyStore();

    importStudents(store, {
      students: [
        { name: 'Ana Silva', grade: '5', className: '5A', cc: '123456780AA1', nif: '123456789', studentNumber: '2025001' },
        { name: 'Bruno Costa', grade: '5', className: '5A', cc: '123456781BB2', nif: '223456789', studentNumber: '2025002' },
      ],
    });

    const campaign = createCampaign(store, {
      title: 'Fluxo completo',
      semester: 1,
      schoolYear: '2025/2026',
      startsAt: '2026-04-10T09:00:00.000Z',
      endsAt: '2026-04-20T18:00:00.000Z',
      defaultCapacity: 1,
      openImmediately: true,
      slots: [
        {
          label: 'Quinta 14:00',
          startsAt: '2026-04-11T14:00:00.000Z',
          endsAt: '2026-04-11T15:00:00.000Z',
          eligibleGrades: ['5'],
        },
      ],
      clubs: [
        { name: 'Robótica', teacher: 'Prof. Nuno', slotLabel: 'Quinta 14:00', capacityOverride: 1 },
        { name: 'Ciência Viva', teacher: 'Prof. Marta', slotLabel: 'Quinta 14:00', capacityOverride: 1 },
      ],
      reservations: [],
    });

    const ana = store.students.find((student) => student.studentNumber === '2025001');
    const anaCode = store.accessCodes.find((code) => code.campaignId === campaign.id && code.studentId === ana?.id);
    const identified = await identifyStudentForCampaignInStore(store, campaign.slug, '2025001', anaCode!.code, 'e2e-parent');
    const chosenClub = identified.options[0]?.clubs[0];

    expect(chosenClub).toBeDefined();

    submitEnrollmentChoiceInStore(store, {
      campaignSlug: campaign.slug,
      studentId: ana!.id,
      accessCode: anaCode!.code,
      choices: [{ slotId: identified.options[0].slot.id, clubId: chosenClub!.id }],
    });

    const bruno = store.students.find((student) => student.studentNumber === '2025002');
    const brunoCode = store.accessCodes.find((code) => code.campaignId === campaign.id && code.studentId === bruno?.id);
    const brunoContext = getStudentEnrollmentContextInStore(store, campaign.slug, bruno!.id, brunoCode!.code);

    expect(brunoContext.options[0]?.clubs.some((club) => club.id === chosenClub!.id)).toBe(false);

    closeCampaign(store, campaign.id);
    commitCampaignAllocation(store, campaign.id);
    const finalization = await finalizeCampaign(store, campaign.id);

    expect(store.submissions).toHaveLength(1);
    expect(store.placements.length).toBeGreaterThanOrEqual(2);
    expect(finalization.generatedDocuments.length).toBeGreaterThan(0);
    expect(store.documents.some((document) => document.documentType === 'club_list')).toBe(true);
    expect(store.documents.some((document) => document.documentType === 'student_schedule')).toBe(true);
  });
});
