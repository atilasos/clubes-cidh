type Semester = "S1" | "S2";

type StudentInput = {
  id: string;
  name: string;
  eligibleSlotIds: string[];
};

type ClubInput = {
  id: string;
  slotId: string;
  name: string;
  defaultCapacity: number;
  manualCapacity?: number;
};

type PlacementInput = {
  studentId: string;
  clubId: string;
  slotId: string;
};

type HistoryInput = {
  studentId: string;
  clubId: string;
  semester: Semester;
  schoolYear: string;
};

type AllocationResult = {
  studentId: string;
  clubId: string;
  slotId: string;
  repeatedClub: boolean;
  reason: string;
};

function getClubCapacity(club: ClubInput) {
  return club.manualCapacity ?? club.defaultCapacity;
}

function getPlacementCount(placements: PlacementInput[], clubId: string) {
  return placements.filter((placement) => placement.clubId === clubId).length;
}

function hasRepeatedClub(
  history: HistoryInput[],
  studentId: string,
  clubId: string,
  schoolYear: string,
  semester: Semester,
) {
  return history.some((entry) => {
    if (entry.studentId !== studentId || entry.clubId !== clubId || entry.schoolYear !== schoolYear) {
      return false;
    }

    if (semester === "S2") {
      return true;
    }

    return entry.semester === semester;
  });
}

export function allocateUnplacedStudents(input: {
  students: StudentInput[];
  clubs: ClubInput[];
  existingPlacements: PlacementInput[];
  studentClubHistory: HistoryInput[];
  semester: Semester;
  schoolYear: string;
}): AllocationResult[] {
  const workingPlacements = [...input.existingPlacements];
  const results: AllocationResult[] = [];

  for (const student of input.students) {
    const occupiedSlotIds = new Set(
      workingPlacements.filter((placement) => placement.studentId === student.id).map((placement) => placement.slotId),
    );
    const pendingSlotIds = student.eligibleSlotIds.filter((slotId) => !occupiedSlotIds.has(slotId));

    for (const slotId of pendingSlotIds) {
      const available = input.clubs.filter(
        (club) =>
          club.slotId === slotId &&
          getPlacementCount(workingPlacements, club.id) < getClubCapacity(club),
      );

      if (available.length === 0) {
        continue;
      }

      const sortedCandidates = [...available].sort((left, right) => {
        const leftRepeated = hasRepeatedClub(
          input.studentClubHistory,
          student.id,
          left.id,
          input.schoolYear,
          input.semester,
        );
        const rightRepeated = hasRepeatedClub(
          input.studentClubHistory,
          student.id,
          right.id,
          input.schoolYear,
          input.semester,
        );

        if (leftRepeated !== rightRepeated) {
          return Number(leftRepeated) - Number(rightRepeated);
        }

        const leftLoad = getPlacementCount(workingPlacements, left.id);
        const rightLoad = getPlacementCount(workingPlacements, right.id);
        if (leftLoad !== rightLoad) {
          return leftLoad - rightLoad;
        }

        return left.name.localeCompare(right.name);
      });

      const chosen = sortedCandidates[0];
      const repeatedClub = hasRepeatedClub(
        input.studentClubHistory,
        student.id,
        chosen.id,
        input.schoolYear,
        input.semester,
      );

      workingPlacements.push({
        studentId: student.id,
        clubId: chosen.id,
        slotId: chosen.slotId,
      });

      results.push({
        studentId: student.id,
        clubId: chosen.id,
        slotId: chosen.slotId,
        repeatedClub,
        reason: repeatedClub
          ? "Não restou alternativa neste horário, pelo que foi registada uma repetição inevitável."
          : "O aluno foi colocado num clube elegível com vagas disponíveis neste horário.",
      });
    }
  }

  return results;
}
