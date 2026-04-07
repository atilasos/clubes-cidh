import { z } from "zod";
import { codesMatch, generateAccessCode, maskSensitiveValue, normalizeIdentifier } from "@/server/lib/security";
import { createId, invariant, nowIso, slugify } from "@/server/lib/utils";
import { recordAuditLog } from "@/server/services/audit-log-service";
import { getRemainingCapacity } from "@/server/services/capacity-service";
import {
  Campaign,
  CampaignAccessCode,
  CampaignAccessExport,
  Club,
  DataStore,
  FinalPlacement,
  Reservation,
  TimeSlot,
} from "@/server/types";

const slotSchema = z.object({
  label: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  eligibleGrades: z.array(z.string()).default([]),
});

const clubSchema = z.object({
  name: z.string().min(1),
  teacher: z.string().min(1),
  description: z.string().optional(),
  slotLabel: z.string().min(1),
  capacityOverride: z.number().int().positive().nullable().optional(),
});

const reservationSchema = z.object({
  studentNumber: z.string().min(1),
  clubName: z.string().min(1),
  reason: z.string().min(3),
});

const campaignInputSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3).optional(),
  semester: z.union([z.literal(1), z.literal(2)]),
  schoolYear: z.string().min(4),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  defaultCapacity: z.number().int().positive(),
  openImmediately: z.boolean().default(true),
  slots: z.array(slotSchema).min(1),
  clubs: z.array(clubSchema).min(1),
  reservations: z.array(reservationSchema).default([]),
});

export type CampaignCreateInput = z.infer<typeof campaignInputSchema>;

function createAccessCodes(campaign: Campaign, studentIds: string[]): CampaignAccessCode[] {
  return studentIds.map((studentId) => ({
    id: createId(),
    campaignId: campaign.id,
    studentId,
    code: generateAccessCode(),
    expiresAt: campaign.endsAt,
  }));
}

function createReservationPlacement(reservation: Reservation): FinalPlacement {
  return {
    id: createId(),
    campaignId: reservation.campaignId,
    studentId: reservation.studentId,
    slotId: reservation.slotId,
    clubId: reservation.clubId,
    source: "reservation",
    reason: reservation.reason,
    createdAt: reservation.createdAt,
  };
}

export function createCampaign(
  store: DataStore,
  payload: CampaignCreateInput,
  actor = "admin",
): Campaign {
  const input = campaignInputSchema.parse(payload);
  invariant(store.students.length > 0, "Importe alunos antes de criar uma campanha.");

  const slug = slugify(input.slug ?? input.title);
  invariant(!store.campaigns.some((campaign) => campaign.slug === slug), "Slug de campanha já existe.");

  const campaign: Campaign = {
    id: createId(),
    slug,
    title: input.title,
    semester: input.semester,
    schoolYear: input.schoolYear,
    status: input.openImmediately ? "open" : "draft",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    defaultCapacity: input.defaultCapacity,
    createdAt: nowIso(),
  };

  const slots: TimeSlot[] = input.slots.map((slot) => ({
    id: createId(),
    campaignId: campaign.id,
    label: slot.label,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    eligibleGrades: slot.eligibleGrades,
  }));

  const clubs: Club[] = input.clubs.map((club) => {
    const slot = slots.find((entry) => entry.label === club.slotLabel);
    invariant(slot, `Slot não encontrado para o clube ${club.name}.`);
    return {
      id: createId(),
      campaignId: campaign.id,
      slotId: slot.id,
      name: club.name,
      teacher: club.teacher,
      description: club.description,
      capacityOverride: club.capacityOverride ?? null,
    };
  });

  const accessCodes = createAccessCodes(campaign, store.students.map((student) => student.id));
  const reservations: Reservation[] = [];
  const reservationPlacements: FinalPlacement[] = [];

  for (const entry of input.reservations) {
    const student = store.students.find((candidate) => candidate.studentNumber === normalizeIdentifier(entry.studentNumber));
    invariant(student, `Aluno ${entry.studentNumber} não encontrado para reserva.`);
    const club = clubs.find((candidate) => candidate.name === entry.clubName);
    invariant(club, `Clube ${entry.clubName} não encontrado para reserva.`);
    const reservation: Reservation = {
      id: createId(),
      campaignId: campaign.id,
      studentId: student.id,
      slotId: club.slotId,
      clubId: club.id,
      reason: entry.reason,
      createdAt: nowIso(),
      createdBy: actor,
    };
    reservations.push(reservation);
    reservationPlacements.push(createReservationPlacement(reservation));
    const syntheticStore: DataStore = {
      ...store,
      campaigns: [...store.campaigns, campaign],
      clubs: [...store.clubs, ...clubs],
      placements: [...store.placements, ...reservationPlacements],
    };
    invariant(getRemainingCapacity(syntheticStore, club.id) >= 0, `Reserva ultrapassa as vagas do clube ${club.name}.`);
  }

  store.campaigns.push(campaign);
  store.timeSlots.push(...slots);
  store.clubs.push(...clubs);
  store.accessCodes.push(...accessCodes);
  store.reservations.push(...reservations);
  store.placements.push(...reservationPlacements);

  recordAuditLog(store, {
    entityType: "campaign",
    entityId: campaign.id,
    action: input.openImmediately ? "campaign_opened" : "campaign_created",
    actor,
    details: {
      slots: slots.length,
      clubs: clubs.length,
      reservations: reservations.length,
    },
  });

  return campaign;
}

export function getCampaignBySlug(store: DataStore, campaignSlug: string) {
  return store.campaigns.find((campaign) => campaign.slug === campaignSlug);
}

export function getCampaignWithRelations(store: DataStore, campaignId: string) {
  const campaign = store.campaigns.find((entry) => entry.id === campaignId);
  invariant(campaign, "Campanha não encontrada.");
  return {
    campaign,
    slots: store.timeSlots.filter((slot) => slot.campaignId === campaignId),
    clubs: store.clubs.filter((club) => club.campaignId === campaignId),
    placements: store.placements.filter((placement) => placement.campaignId === campaignId),
    exceptions: store.exceptions.filter((exception) => exception.campaignId === campaignId),
  };
}

export function exportCampaignAccessPackage(
  store: DataStore,
  campaignId: string,
  baseUrl: string,
  actor = "admin",
): CampaignAccessExport {
  const campaign = store.campaigns.find((entry) => entry.id === campaignId);
  invariant(campaign, "Campanha não encontrada.");

  const rows = store.accessCodes
    .filter((entry) => entry.campaignId === campaignId && !entry.revokedAt)
    .map((code) => {
      const student = store.students.find((entry) => entry.id === code.studentId);
      invariant(student, "Aluno não encontrado para exportação.");
      return {
        studentId: student.id,
        studentName: student.name,
        maskedIdentifier: maskSensitiveValue(student.studentNumber) ?? student.studentNumber,
        code: code.code,
        publicUrl: `${baseUrl.replace(/\/$/, "")}/campaign/${campaign.slug}`,
      };
    });

  const nextExport: CampaignAccessExport = {
    id: createId(),
    campaignId,
    createdAt: nowIso(),
    rows,
  };
  store.accessExports.unshift(nextExport);

  recordAuditLog(store, {
    entityType: "campaign_access_export",
    entityId: nextExport.id,
    action: "access_export_generated",
    actor,
    details: { rows: rows.length },
  });

  return nextExport;
}

export function validateCampaignAccessCode(
  store: DataStore,
  campaignId: string,
  studentId: string,
  code: string,
) {
  const record = store.accessCodes.find(
    (entry) => entry.campaignId === campaignId && entry.studentId === studentId && !entry.revokedAt,
  );
  invariant(record, "Código de acesso não encontrado.");
  invariant(new Date(record.expiresAt).getTime() >= Date.now(), "Código de acesso expirado.");
  invariant(codesMatch(record.code, code), "Código de acesso inválido.");
  return record;
}
