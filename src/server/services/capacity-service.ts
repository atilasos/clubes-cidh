import { Club, DataStore } from "@/server/types";

export type SlotCapacityRule = {
  totalStudents: number;
  divisor: number;
  minimumPerClub?: number;
};

export type ClubCapacitySummary = {
  total: number;
  reserved: number;
  remaining: number;
};

type CapacityFixtureClub = {
  id: string;
  slotId: string;
  defaultCapacity: number;
  manualCapacity?: number;
};

type CapacityFixtureReservation = {
  clubId: string;
};

export function computeClubCapacities(input: {
  clubs: CapacityFixtureClub[];
  slotRule: Record<string, SlotCapacityRule>;
  reservations: CapacityFixtureReservation[];
}): Record<string, ClubCapacitySummary> {
  return input.clubs.reduce<Record<string, ClubCapacitySummary>>((result, club) => {
    const slotRule = input.slotRule[club.slotId];
    const computedDefault = slotRule
      ? Math.max(slotRule.minimumPerClub ?? 1, Math.ceil(slotRule.totalStudents / slotRule.divisor))
      : club.defaultCapacity;
    const reserved = input.reservations.filter((reservation) => reservation.clubId === club.id).length;
    const total = reserved > 0 && club.manualCapacity ? club.manualCapacity : computedDefault;

    result[club.id] = {
      total,
      reserved,
      remaining: Math.max(0, total - reserved),
    };

    return result;
  }, {});
}

export function getClubCapacity(store: DataStore, club: Club) {
  const campaign = store.campaigns.find((entry) => entry.id === club.campaignId);
  if (!campaign) {
    throw new Error("Campanha não encontrada para cálculo de vagas.");
  }
  return club.capacityOverride ?? campaign.defaultCapacity;
}

export function getPlacementCount(store: DataStore, clubId: string) {
  return store.placements.filter((entry) => entry.clubId === clubId).length;
}

export function getRemainingCapacity(store: DataStore, clubId: string) {
  const club = store.clubs.find((entry) => entry.id === clubId);
  if (!club) return 0;
  return Math.max(0, getClubCapacity(store, club) - getPlacementCount(store, clubId));
}

export function getSlotAvailability(store: DataStore, campaignId: string, slotId: string) {
  return store.clubs
    .filter((club) => club.campaignId === campaignId && club.slotId === slotId)
    .map((club) => ({
      ...club,
      remainingCapacity: getRemainingCapacity(store, club.id),
      capacity: getClubCapacity(store, club),
    }));
}
