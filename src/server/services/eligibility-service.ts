import { ClubCapacitySummary, getSlotAvailability } from "@/server/services/capacity-service";
import { Campaign, DataStore, EligibleClubOption, Student } from "@/server/types";

function isGradeEligible(student: Student, eligibleGrades: string[]) {
  return eligibleGrades.length === 0 || eligibleGrades.includes(student.grade);
}

type FixtureStudent = {
  id: string;
  eligibleSlotIds: string[];
};

type FixtureClub = {
  id: string;
  slotId: string;
};

type FixtureReservation = {
  studentId: string;
  clubId: string;
  slotId: string;
};

type FixturePlacement = {
  studentId: string;
  slotId: string;
};

export function getEligibleClubsForStudent(input: {
  student: FixtureStudent;
  clubs: FixtureClub[];
  capacities: Record<string, ClubCapacitySummary>;
  reservations: FixtureReservation[];
  existingPlacements: FixturePlacement[];
}) {
  const occupiedSlotIds = new Set(
    input.existingPlacements.filter((placement) => placement.studentId === input.student.id).map((placement) => placement.slotId),
  );

  return input.clubs.filter((club) => {
    if (!input.student.eligibleSlotIds.includes(club.slotId)) return false;
    if (occupiedSlotIds.has(club.slotId)) return false;
    const capacity = input.capacities[club.id];
    if (!capacity || capacity.remaining <= 0) return false;
    return true;
  });
}

export function getEligibleClubOptionsForStudent(store: DataStore, campaign: Campaign, student: Student): EligibleClubOption[] {
  const occupiedSlotIds = new Set(
    store.placements
      .filter((entry) => entry.campaignId === campaign.id && entry.studentId === student.id)
      .map((entry) => entry.slotId),
  );

  return store.timeSlots
    .filter((slot) => slot.campaignId === campaign.id)
    .filter((slot) => !occupiedSlotIds.has(slot.id))
    .filter((slot) => isGradeEligible(student, slot.eligibleGrades))
    .map((slot) => ({
      slot,
      clubs: getSlotAvailability(store, campaign.id, slot.id)
        .filter((club) => club.remainingCapacity > 0)
        .sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .filter((entry) => entry.clubs.length > 0);
}
