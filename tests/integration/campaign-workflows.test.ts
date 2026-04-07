import { afterEach, describe, expect, it, vi } from 'vitest';

import { closeCampaign, commitCampaignAllocation, finalizeCampaign, previewCampaignAllocation } from '../../src/server/services/campaign-operations-service';
import { POST as submitEnrollmentRoute } from '../../src/app/api/public/campaigns/[campaignSlug]/submit/route';
import { createCampaign, exportCampaignAccessPackage, recordCampaignException } from '../../src/server/services/campaign-service';
import { identifyStudentForCampaign, identifyStudentForCampaignInStore } from '../../src/server/services/enrollment-service';
import { importStudents } from '../../src/server/services/student-import-service';
import { readStore, withStore, writeStore } from '../../src/server/store/db';
import type { DataStore } from '../../src/server/types';
import { slotFixtures, studentFixtures } from '../fixtures/campaign-fixtures';
import * as pdfService from '../../src/server/services/pdf-service';

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

function importFixtureStudents(store: DataStore) {
  return importStudents(store, {
    students: studentFixtures.map((student) => ({
      name: student.name,
      grade: String(student.grade),
      className: student.classroom,
      cc: student.cc,
      nif: student.nif,
      studentNumber: student.studentNumber,
    })),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('campaign workflows integration', () => {
  it('imports valid students and returns a rejection report for invalid or duplicate rows', () => {
    const store = createEmptyStore();

    const result = importStudents(store, {
      students: [
        { name: 'Ana Silva', grade: '5', className: '5A', cc: '123456780AA1', nif: '123456789', studentNumber: '2025001' },
        { name: 'Bruno Costa', grade: '5', className: '5A', cc: '123456781BB2', nif: '223456789', studentNumber: '2025002' },
        { name: 'Duplicado', grade: '5', className: '5A', cc: '123456781BB2', nif: '223456789', studentNumber: '2025002' },
        { name: 'Sem turma', grade: '6', className: '', cc: '123456782CC3', nif: '323456789', studentNumber: '2025003' },
      ],
    });

    expect(result.imported).toHaveLength(2);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected.map((entry) => entry.reason)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/duplicado/i),
        expect.stringMatching(/campos em falta/i),
      ]),
    );
    expect(store.auditLogs[0]?.action).toBe('students_imported');
  });

  it('creates a campaign with reservations, exports access codes, and allows public identification', async () => {
    const store = createEmptyStore();
    importFixtureStudents(store);

    const campaign = createCampaign(store, {
      title: 'Clubes 2026 S1',
      semester: 1,
      schoolYear: '2025/2026',
      startsAt: '2026-04-10T09:00:00.000Z',
      endsAt: '2026-04-20T18:00:00.000Z',
      defaultCapacity: 2,
      openImmediately: true,
      slots: [
        {
          label: slotFixtures[0].label,
          startsAt: '2026-04-10T14:00:00.000Z',
          endsAt: '2026-04-10T15:00:00.000Z',
          eligibleGrades: ['5', '6'],
        },
        {
          label: slotFixtures[1].label,
          startsAt: '2026-04-11T14:00:00.000Z',
          endsAt: '2026-04-11T15:00:00.000Z',
          eligibleGrades: ['5', '6'],
        },
      ],
      clubs: [
        { name: 'Teatro', teacher: 'Prof. Sofia', slotLabel: slotFixtures[0].label, capacityOverride: 2 },
        { name: 'Música', teacher: 'Prof. Rita', slotLabel: slotFixtures[0].label, capacityOverride: 1 },
        { name: 'Robótica', teacher: 'Prof. Nuno', slotLabel: slotFixtures[1].label, capacityOverride: 2 },
      ],
      reservations: [{ studentNumber: '2025001', clubName: 'Música', reason: 'Reserva pedagógica' }],
    });

    const exportPackage = exportCampaignAccessPackage(store, campaign.id, 'http://localhost:3000');
    const ana = store.students.find((student) => student.studentNumber === '2025001');
    const anaCode = store.accessCodes.find((code) => code.campaignId === campaign.id && code.studentId === ana?.id);

    expect(exportPackage.rows).toHaveLength(store.students.length);
    expect(store.placements.filter((placement) => placement.source === 'reservation')).toHaveLength(1);
    expect(store.auditLogs.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['campaign_opened', 'access_export_generated']),
    );

    const identified = await identifyStudentForCampaignInStore(
      store,
      campaign.slug,
      '2025001',
      anaCode!.code,
      'integration-test',
    );

    expect(identified.student.name).toBe('Ana Silva');
    expect(identified.options.some((option) => option.slot.label === slotFixtures[1].label)).toBe(true);
  });

  it('persists failed public-identification metrics through the shared store path', async () => {
    const store = createEmptyStore();
    importFixtureStudents(store);

    const campaign = createCampaign(store, {
      title: 'Identificação métrica',
      semester: 1,
      schoolYear: '2025/2026',
      startsAt: '2026-04-10T09:00:00.000Z',
      endsAt: '2026-04-20T18:00:00.000Z',
      defaultCapacity: 1,
      openImmediately: true,
      slots: [{ label: slotFixtures[1].label, startsAt: '2026-04-11T14:00:00.000Z', endsAt: '2026-04-11T15:00:00.000Z', eligibleGrades: ['5'] }],
      clubs: [{ name: 'Robótica', teacher: 'Prof. Nuno', slotLabel: slotFixtures[1].label, capacityOverride: 1 }],
      reservations: [],
    });

    await writeStore(store);

    await expect(
      identifyStudentForCampaign(campaign.slug, '2025001', 'XXXXXX', 'integration-test'),
    ).rejects.toThrow(/não foi possível validar o acesso do aluno/i);

    const persisted = await readStore();
    expect(persisted.metrics.campaign_identification_failures_total).toBe(1);
  });

  it('requires slot targeting when duplicate club names exist across slots for reservations', () => {
    const store = createEmptyStore();
    importFixtureStudents(store);

    expect(() =>
      createCampaign(store, {
        title: 'Clubes duplicados',
        semester: 1,
        schoolYear: '2025/2026',
        startsAt: '2026-04-10T09:00:00.000Z',
        endsAt: '2026-04-20T18:00:00.000Z',
        defaultCapacity: 1,
        openImmediately: true,
        slots: [
          { label: 'Segunda 14:00', startsAt: '2026-04-10T14:00:00.000Z', endsAt: '2026-04-10T15:00:00.000Z', eligibleGrades: ['5'] },
          { label: 'Terça 14:00', startsAt: '2026-04-11T14:00:00.000Z', endsAt: '2026-04-11T15:00:00.000Z', eligibleGrades: ['5'] },
        ],
        clubs: [
          { name: 'Robótica', teacher: 'Prof. Nuno', slotLabel: 'Segunda 14:00', capacityOverride: 1 },
          { name: 'Robótica', teacher: 'Prof. Sara', slotLabel: 'Terça 14:00', capacityOverride: 1 },
        ],
        reservations: [{ studentNumber: '2025001', clubName: 'Robótica', reason: 'Reserva ambígua' }],
      }),
    ).toThrow(/horário/i);
  });

  it('creates a dry-run allocation preview without persisting and commits placements when confirmed', () => {
    const store = createEmptyStore();
    importFixtureStudents(store);

    const campaign = createCampaign(store, {
      title: 'Clubes 2026 S2',
      semester: 2,
      schoolYear: '2025/2026',
      startsAt: '2026-09-10T09:00:00.000Z',
      endsAt: '2026-09-20T18:00:00.000Z',
      defaultCapacity: 2,
      openImmediately: true,
      slots: [
        {
          label: slotFixtures[0].label,
          startsAt: '2026-09-10T14:00:00.000Z',
          endsAt: '2026-09-10T15:00:00.000Z',
          eligibleGrades: ['5', '6'],
        },
      ],
      clubs: [
        { name: 'Teatro', teacher: 'Prof. Sofia', slotLabel: slotFixtures[0].label, capacityOverride: 2 },
        { name: 'Música', teacher: 'Prof. Rita', slotLabel: slotFixtures[0].label, capacityOverride: 2 },
      ],
      reservations: [],
    });

    closeCampaign(store, campaign.id);

    const preview = previewCampaignAllocation(store, campaign.id);
    expect(preview.preview.length).toBeGreaterThan(0);
    expect(store.placements).toHaveLength(0);

    const committed = commitCampaignAllocation(store, campaign.id);
    expect(committed.committed).toBe(true);
    expect(store.placements).toHaveLength(committed.preview.length);
    expect(store.auditLogs[0]?.action).toBe('allocation_committed');
  });

  it('blocks finalization while pending targets remain and unlocks after an explicit exception', async () => {
    const store = createEmptyStore();
    importFixtureStudents(store);

    const campaign = createCampaign(store, {
      title: 'Capacidade limitada',
      semester: 1,
      schoolYear: '2025/2026',
      startsAt: '2026-04-10T09:00:00.000Z',
      endsAt: '2026-04-20T18:00:00.000Z',
      defaultCapacity: 1,
      openImmediately: true,
      slots: [
        {
          label: slotFixtures[1].label,
          startsAt: '2026-04-11T14:00:00.000Z',
          endsAt: '2026-04-11T15:00:00.000Z',
          eligibleGrades: ['5'],
        },
      ],
      clubs: [{ name: 'Robótica', teacher: 'Prof. Nuno', slotLabel: slotFixtures[1].label, capacityOverride: 1 }],
      reservations: [],
    });

    closeCampaign(store, campaign.id);

    commitCampaignAllocation(store, campaign.id);

    await expect(finalizeCampaign(store, campaign.id)).rejects.toThrow(/exceção explícita/i);

    const remainingStudent = store.students.find(
      (student) => !store.placements.some((placement) => placement.studentId === student.id),
    );
    const onlySlot = store.timeSlots.find((slot) => slot.campaignId === campaign.id);
    recordCampaignException(
      store,
      {
        campaignId: campaign.id,
        studentId: remainingStudent!.id,
        slotId: onlySlot!.id,
        reason: 'Sem vagas disponíveis neste horário',
      },
      'admin',
    );

    const archiveResult = await finalizeCampaign(store, campaign.id);

    expect(archiveResult.generatedDocuments.length).toBeGreaterThan(0);
    expect(store.documents.length).toBe(archiveResult.generatedDocuments.length);
    expect(store.history.length).toBeGreaterThan(0);
    expect(store.auditLogs[0]?.action).toBe('campaign_archived');
    expect(store.documents.some((document) => document.documentType === 'student_schedule' && document.subjectId === remainingStudent!.id)).toBe(true);
  });

  it('does not partially archive semester history when PDF generation fails during finalization', async () => {
    const store = createEmptyStore();
    importFixtureStudents(store);

    const campaign = createCampaign(store, {
      title: 'Falha PDF',
      semester: 1,
      schoolYear: '2025/2026',
      startsAt: '2026-04-10T09:00:00.000Z',
      endsAt: '2026-04-20T18:00:00.000Z',
      defaultCapacity: 1,
      openImmediately: true,
      slots: [
        {
          label: slotFixtures[1].label,
          startsAt: '2026-04-11T14:00:00.000Z',
          endsAt: '2026-04-11T15:00:00.000Z',
          eligibleGrades: ['5'],
        },
      ],
      clubs: [{ name: 'Robótica', teacher: 'Prof. Nuno', slotLabel: slotFixtures[1].label, capacityOverride: 2 }],
      reservations: [],
    });

    closeCampaign(store, campaign.id);
    commitCampaignAllocation(store, campaign.id);

    vi.spyOn(pdfService, 'generateCampaignDocuments').mockRejectedValue(new Error('pdf failed'));

    await expect(finalizeCampaign(store, campaign.id)).rejects.toThrow(/pdf failed/i);

    expect(store.history).toHaveLength(0);
    expect(store.documents).toHaveLength(0);
    expect(store.campaigns.find((entry) => entry.id === campaign.id)?.status).toBe('closed');
    expect(store.metrics.pdf_generation_failures_total).toBe(1);
  });

  it('uses the live public submit route so only one request wins the final seat', async () => {
    const store = createEmptyStore();
    importFixtureStudents(store);

    const campaign = createCampaign(store, {
      title: 'Concorrência rota pública',
      semester: 1,
      schoolYear: '2025/2026',
      startsAt: '2026-04-10T09:00:00.000Z',
      endsAt: '2026-04-20T18:00:00.000Z',
      defaultCapacity: 1,
      openImmediately: true,
      slots: [
        {
          label: slotFixtures[1].label,
          startsAt: '2026-04-11T14:00:00.000Z',
          endsAt: '2026-04-11T15:00:00.000Z',
          eligibleGrades: ['5'],
        },
      ],
      clubs: [{ name: 'Robótica', teacher: 'Prof. Nuno', slotLabel: slotFixtures[1].label, capacityOverride: 1 }],
      reservations: [],
    });

    await writeStore(store);

    const robotics = store.clubs.find((club) => club.campaignId === campaign.id)!;
    const slot = store.timeSlots.find((entry) => entry.id === robotics.slotId)!;
    const ana = store.students.find((student) => student.studentNumber === '2025001')!;
    const bruno = store.students.find((student) => student.studentNumber === '2025002')!;
    const anaCode = store.accessCodes.find((entry) => entry.campaignId === campaign.id && entry.studentId === ana.id)!;
    const brunoCode = store.accessCodes.find((entry) => entry.campaignId === campaign.id && entry.studentId === bruno.id)!;

    const [first, second] = await Promise.all([
      submitEnrollmentRoute(
        new Request('http://test.local', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            studentId: ana.id,
            accessCode: anaCode.code,
            choices: [{ slotId: slot.id, clubId: robotics.id }],
          }),
        }),
        { params: Promise.resolve({ campaignSlug: campaign.slug }) },
      ),
      submitEnrollmentRoute(
        new Request('http://test.local', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            studentId: bruno.id,
            accessCode: brunoCode.code,
            choices: [{ slotId: slot.id, clubId: robotics.id }],
          }),
        }),
        { params: Promise.resolve({ campaignSlug: campaign.slug }) },
      ),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 400]);

    const persisted = await readStore();
    expect(persisted.submissions.filter((submission) => submission.campaignId === campaign.id)).toHaveLength(1);
    expect(persisted.placements.filter((placement) => placement.campaignId === campaign.id && placement.clubId === robotics.id)).toHaveLength(1);
  });

  it('recovers the shared store queue after a failed mutation so later writes still succeed', async () => {
    await writeStore(createEmptyStore());

    await expect(
      withStore(() => {
        throw new Error('falha esperada');
      }),
    ).rejects.toThrow(/falha esperada/i);

    await expect(
      withStore((store) => {
        store.metrics.recovered_after_failure = 1;
        return 'ok';
      }),
    ).resolves.toBe('ok');

    const persisted = await readStore();
    expect(persisted.metrics.recovered_after_failure).toBe(1);
  });
});
