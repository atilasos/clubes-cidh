import { describe, expect, it } from 'vitest';

import { clubFixtures, firstSemesterHistory, studentFixtures } from '../fixtures/campaign-fixtures';
import { allocateUnplacedStudents } from '../../src/server/services/allocation-service';

describe('allocation-service', () => {
  it('prefers clubs that the student has not yet attended in the current school year', () => {
    const placements = allocateUnplacedStudents({
      students: [studentFixtures.find((student) => student.id === 'ana')!],
      clubs: clubFixtures.filter((club) => club.slotId === 'slot-science'),
      existingPlacements: [],
      studentClubHistory: firstSemesterHistory,
      semester: 'S2',
      schoolYear: '2025/2026',
    });

    expect(placements).toEqual([
      expect.objectContaining({ studentId: 'ana', clubId: 'science-lab', repeatedClub: false }),
    ]);
  });

  it('allows repetition only when no valid alternative exists and records an audit reason', () => {
    const placements = allocateUnplacedStudents({
      students: [studentFixtures.find((student) => student.id === 'bruno')!],
      clubs: [{ id: 'science-lab', slotId: 'slot-science', name: 'Ciência Viva', defaultCapacity: 1 }],
      existingPlacements: [],
      studentClubHistory: firstSemesterHistory,
      semester: 'S2',
      schoolYear: '2025/2026',
    });

    expect(placements).toEqual([
      expect.objectContaining({
        studentId: 'bruno',
        clubId: 'science-lab',
        repeatedClub: true,
        reason: expect.stringMatching(/não restou alternativa|repetição inevitável/i),
      }),
    ]);
  });
});
