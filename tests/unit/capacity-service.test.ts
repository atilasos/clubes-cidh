import { describe, expect, it } from 'vitest';

import { clubFixtures, reservationFixtures } from '../fixtures/campaign-fixtures';
import { computeClubCapacities } from '../../src/server/services/capacity-service';

describe('capacity-service', () => {
  it('calculates the default capacity rule per slot', () => {
    const capacities = computeClubCapacities({
      clubs: clubFixtures,
      slotRule: {
        'slot-arts': { totalStudents: 4, divisor: 2, minimumPerClub: 1 },
        'slot-science': { totalStudents: 4, divisor: 2, minimumPerClub: 1 },
      },
      reservations: [],
    });

    expect(capacities).toEqual({
      robotics: { total: 2, reserved: 0, remaining: 2 },
      'science-lab': { total: 2, reserved: 0, remaining: 2 },
      theatre: { total: 2, reserved: 0, remaining: 2 },
      music: { total: 2, reserved: 0, remaining: 2 },
    });
  });

  it('respects a manual capacity override and subtracts reservations from remaining seats', () => {
    const capacities = computeClubCapacities({
      clubs: clubFixtures,
      slotRule: {
        'slot-arts': { totalStudents: 4, divisor: 2, minimumPerClub: 1 },
        'slot-science': { totalStudents: 4, divisor: 2, minimumPerClub: 1 },
      },
      reservations: reservationFixtures,
    });

    expect(capacities.music).toEqual({ total: 1, reserved: 1, remaining: 0 });
    expect(capacities.theatre).toEqual({ total: 2, reserved: 0, remaining: 2 });
  });
});
