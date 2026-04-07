import { describe, expect, it } from 'vitest';

import { clubFixtures, reservationFixtures, studentFixtures } from '../fixtures/campaign-fixtures';
import { getEligibleClubsForStudent } from '../../src/server/services/eligibility-service';

describe('eligibility-service', () => {
  it('returns only clubs that belong to the student eligible slots', () => {
    const clubs = getEligibleClubsForStudent({
      student: studentFixtures.find((student) => student.id === 'bruno')!,
      clubs: clubFixtures,
      capacities: {
        robotics: { total: 2, reserved: 0, remaining: 2 },
        'science-lab': { total: 2, reserved: 0, remaining: 2 },
        theatre: { total: 2, reserved: 0, remaining: 2 },
        music: { total: 1, reserved: 1, remaining: 0 },
      },
      reservations: reservationFixtures,
      existingPlacements: [],
    });

    expect(clubs.map((club) => club.id)).toEqual(['robotics', 'science-lab']);
  });

  it('hides clubs that are already full for that slot', () => {
    const clubs = getEligibleClubsForStudent({
      student: studentFixtures.find((student) => student.id === 'ana')!,
      clubs: clubFixtures,
      capacities: {
        robotics: { total: 2, reserved: 0, remaining: 2 },
        'science-lab': { total: 2, reserved: 0, remaining: 2 },
        theatre: { total: 2, reserved: 0, remaining: 2 },
        music: { total: 1, reserved: 1, remaining: 0 },
      },
      reservations: reservationFixtures,
      existingPlacements: [],
    });

    expect(clubs.map((club) => club.id)).toEqual(['robotics', 'science-lab', 'theatre']);
    expect(clubs.some((club) => club.id === 'music')).toBe(false);
  });
});
