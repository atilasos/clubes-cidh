import { describe, expect, it } from 'vitest';

import { lastSeatRace } from '../fixtures/campaign-fixtures';
import { submitEnrollmentChoices } from '../../src/server/services/enrollment-service';

describe('enrollment-service', () => {
  it('rejects a duplicate submission for the same student and campaign', async () => {
    await expect(
      submitEnrollmentChoices({
        campaignId: 'campaign-1',
        studentId: 'ana',
        accessCode: '123456',
        submittedAt: '2026-04-07T10:00:00.000Z',
        choices: [{ slotId: 'slot-science', clubId: 'robotics' }],
        existingSubmissions: [{ studentId: 'ana', campaignId: 'campaign-1' }],
        capacities: { robotics: { total: 2, reserved: 0, remaining: 2 } },
      }),
    ).rejects.toThrow(/duplicate/i);
  });

  it('prevents two valid choices in the same slot inside one submission', async () => {
    await expect(
      submitEnrollmentChoices({
        campaignId: 'campaign-1',
        studentId: 'carla',
        accessCode: '123456',
        submittedAt: '2026-04-07T10:00:00.000Z',
        choices: [
          { slotId: 'slot-science', clubId: 'robotics' },
          { slotId: 'slot-science', clubId: 'science-lab' },
        ],
        existingSubmissions: [],
        capacities: {
          robotics: { total: 2, reserved: 0, remaining: 2 },
          'science-lab': { total: 2, reserved: 0, remaining: 2 },
        },
      }),
    ).rejects.toThrow(/same slot/i);
  });

  it('accepts only the earliest concurrent submission for the last remaining seat', async () => {
    const result = await submitEnrollmentChoices({
      campaignId: 'campaign-1',
      studentId: lastSeatRace.submissions[0].studentId,
      accessCode: '123456',
      submittedAt: lastSeatRace.submissions[0].submittedAt,
      choices: [...lastSeatRace.submissions[0].choices],
      existingSubmissions: [],
      capacities: {
        [lastSeatRace.clubId]: { total: 1, reserved: 0, remaining: lastSeatRace.remainingCapacity },
      },
      competingSubmissions: lastSeatRace.submissions.slice(1),
    });

    expect(result).toMatchObject({
      acceptedChoices: [{ slotId: 'slot-science', clubId: 'robotics' }],
      rejectedSubmissions: [
        {
          studentId: 'bruno',
          reason: expect.stringMatching(/unavailable|capacity/i),
        },
      ],
      capacities: {
        robotics: { total: 1, reserved: 0, remaining: 0 },
      },
    });
  });
});
