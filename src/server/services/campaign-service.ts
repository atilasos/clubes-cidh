import { z } from "zod";
import { codesMatch, generateAccessCode, maskSensitiveValue, normalizeIdentifier } from "@/server/lib/security";
import { createId, invariant, nowIso, slugify } from "@/server/lib/utils";
import { recordAuditLog } from "@/server/services/audit-log-service";
import { getRemainingCapacity } from "@/server/services/capacity-service";
import { getEligibleTimeSlotsForStudent } from "@/server/services/eligibility-service";
import {
  Campaign,
  CampaignAccessCode,
  CampaignAccessExport,
  CampaignException,
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
  capacityDivisor: z.number().int().positive().nullable().optional(),
  minimumPerClub: z.number().int().positive().nullable().optional(),
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
  slotLabel: z.string().min(1).optional(),
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

export function resolveCampaignStatus(campaign: Campaign): Campaign["status"] {
  if (campaign.status === "open" && new Date(campaign.endsAt).getTime() <= Date.now()) {
    return "closed";
  }

  return campaign.status;
}

function withResolvedCampaignStatus(campaign: Campaign): Campaign {
  return {
    ...campaign,
    status: resolveCampaignStatus(campaign),
  };
}

export function syncCampaignStatus(store: DataStore, campaignId: string, actor = "system") {
  const campaign = store.campaigns.find((entry) => entry.id === campaignId);
  invariant(campaign, "Campanha não encontrada.");

  const resolvedStatus = resolveCampaignStatus(campaign);
  if (campaign.status !== resolvedStatus) {
    campaign.status = resolvedStatus;
    recordAuditLog(store, {
      entityType: "campaign",
      entityId: campaign.id,
      action: "campaign_closed",
      actor,
      details: {
        closedAt: nowIso(),
        reason: "deadline_elapsed",
      },
    });
  }

  return campaign;
}

function createAccessCodes(campaign: Campaign, studentIds: string[]): CampaignAccessCode[] {
  return studentIds.map((studentId) => ({
    id: createId(),
    campaignId: campaign.id,
    studentId,
    code: generateAccessCode().slice(0, 6),
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
  invariant(!store.campaigns.some((campaign) => campaign.slug === slug), "O identificador público da campanha já existe.");

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
    capacityDivisor: slot.capacityDivisor ?? null,
    minimumPerClub: slot.minimumPerClub ?? null,
  }));

  const clubs: Club[] = input.clubs.map((club) => {
    const slot = slots.find((entry) => entry.label === club.slotLabel);
    invariant(slot, `Horário não encontrado para o clube ${club.name}.`);
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
    const matchingClubs = clubs.filter((candidate) => candidate.name === entry.clubName);
    invariant(matchingClubs.length > 0, `Clube ${entry.clubName} não encontrado para reserva.`);

    const club = entry.slotLabel
      ? matchingClubs.find((candidate) => {
          const slot = slots.find((slotEntry) => slotEntry.id === candidate.slotId);
          return slot?.label === entry.slotLabel;
        })
      : matchingClubs.length === 1
        ? matchingClubs[0]
        : null;

    invariant(
      club,
      entry.slotLabel
        ? `Clube ${entry.clubName} não encontrado no horário ${entry.slotLabel}.`
        : `Reserva ambígua para ${entry.clubName}; indique também o horário.`,
    );
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
    recordAuditLog(store, {
      entityType: "reservation",
      entityId: reservation.id,
      action: "reservation_created",
      actor,
      details: {
        campaignId: campaign.id,
        studentId: student.id,
        slotId: club.slotId,
        clubId: club.id,
      },
    });
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

  const clubsWithOverride = clubs.filter((club) => club.capacityOverride != null);
  if (clubsWithOverride.length > 0) {
    recordAuditLog(store, {
      entityType: "campaign",
      entityId: campaign.id,
      action: "capacity_override_configured",
      actor,
      details: {
        clubs: clubsWithOverride.map((club) => ({ clubId: club.id, capacityOverride: club.capacityOverride })),
      },
    });
  }

  return campaign;
}

export function getCampaignBySlug(store: DataStore, campaignSlug: string) {
  const campaign = store.campaigns.find((entry) => entry.slug === campaignSlug);
  return campaign ? withResolvedCampaignStatus(campaign) : undefined;
}

export function getCampaignWithRelations(store: DataStore, campaignId: string) {
  const rawCampaign = store.campaigns.find((entry) => entry.id === campaignId);
  const campaign = rawCampaign ? withResolvedCampaignStatus(rawCampaign) : undefined;
  invariant(campaign, "Campanha não encontrada.");
  return {
    campaign,
    slots: store.timeSlots.filter((slot) => slot.campaignId === campaignId),
    clubs: store.clubs.filter((club) => club.campaignId === campaignId),
    placements: store.placements.filter((placement) => placement.campaignId === campaignId),
    exceptions: store.exceptions.filter((exception) => exception.campaignId === campaignId),
  };
}

export function getPendingPlacementTargets(store: DataStore, campaign: Campaign) {
  const placementKeys = new Set(
    store.placements
      .filter((placement) => placement.campaignId === campaign.id)
      .map((placement) => `${placement.studentId}:${placement.slotId}`),
  );
  const exceptionKeys = new Set(
    store.exceptions
      .filter((exception) => exception.campaignId === campaign.id)
      .map((exception) => `${exception.studentId}:${exception.slotId}`),
  );

  return store.students.flatMap((student) =>
    getEligibleTimeSlotsForStudent(store, campaign, student)
      .filter(
        (slot) => !placementKeys.has(`${student.id}:${slot.id}`) && !exceptionKeys.has(`${student.id}:${slot.id}`),
      )
      .map((slot) => ({
        studentId: student.id,
        studentName: student.name,
        grade: student.grade,
        className: student.className,
        slotId: slot.id,
        slotLabel: slot.label,
      })),
  );
}

export function getCampaignDetailView(store: DataStore, campaignSlug: string) {
  const campaign = getCampaignBySlug(store, campaignSlug);
  invariant(campaign, "Campanha não encontrada.");

  const slots = store.timeSlots.filter((slot) => slot.campaignId === campaign.id);
  const clubs = store.clubs.filter((club) => club.campaignId === campaign.id);
  const reservations = store.reservations
    .filter((reservation) => reservation.campaignId === campaign.id)
    .map((reservation) => ({
      ...reservation,
      student: store.students.find((student) => student.id === reservation.studentId),
      club: clubs.find((club) => club.id === reservation.clubId),
      slot: slots.find((slot) => slot.id === reservation.slotId),
    }));
  const placements = store.placements
    .filter((placement) => placement.campaignId === campaign.id)
    .map((placement) => ({
      ...placement,
      student: store.students.find((student) => student.id === placement.studentId),
      club: clubs.find((club) => club.id === placement.clubId),
      slot: slots.find((slot) => slot.id === placement.slotId),
    }));
  const exceptions = store.exceptions
    .filter((exception) => exception.campaignId === campaign.id)
    .map((exception) => ({
      ...exception,
      student: store.students.find((student) => student.id === exception.studentId),
      slot: slots.find((slot) => slot.id === exception.slotId),
    }));
  const documents = store.documents.filter((document) => document.campaignId === campaign.id);
  const exports = store.accessExports.filter((entry) => entry.campaignId === campaign.id);

  return {
    campaign,
    slots: slots.map((slot) => ({
      ...slot,
      clubs: clubs
        .filter((club) => club.slotId === slot.id)
        .map((club) => ({
          ...club,
          remainingCapacity: getRemainingCapacity(store, club.id),
          placements: placements.filter((placement) => placement.clubId === club.id),
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    })),
    reservations,
    placements,
    exceptions,
    documents,
    accessExports: exports,
    pendingTargets: getPendingPlacementTargets(store, campaign),
    auditLogs: store.auditLogs.filter(
      (entry) =>
        entry.entityId === campaign.id ||
        entry.details.campaignId === campaign.id,
    ),
  };
}

export function exportCampaignAccessPackage(
  store: DataStore,
  campaignId: string,
  baseUrl: string,
  actor = "admin",
): CampaignAccessExport {
  const campaign = syncCampaignStatus(store, campaignId, actor);
  invariant(campaign, "Campanha não encontrada.");
  invariant(
    campaign.status !== "finalized" && campaign.status !== "archived",
    "Não é possível gerar novos pacotes de acesso depois da finalização da campanha.",
  );

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

export function recordCampaignException(
  store: DataStore,
  input: {
    campaignId: string;
    studentId: string;
    slotId: string;
    reason: string;
  },
  actor = "admin",
): CampaignException {
  const campaign = syncCampaignStatus(store, input.campaignId);
  invariant(campaign.status === "closed", "Só é possível registar exceções depois de fechar a campanha.");

  const student = store.students.find((entry) => entry.id === input.studentId);
  invariant(student, "Aluno não encontrado.");

  const slot = store.timeSlots.find((entry) => entry.id === input.slotId && entry.campaignId === input.campaignId);
  invariant(slot, "Horário não encontrado para a campanha.");

  invariant(
    !store.placements.some(
      (placement) =>
        placement.campaignId === input.campaignId &&
        placement.studentId === input.studentId &&
        placement.slotId === input.slotId,
    ),
    "Não é possível marcar exceção para um horário já colocado.",
  );

  const existing = store.exceptions.find(
    (exception) =>
      exception.campaignId === input.campaignId &&
      exception.studentId === input.studentId &&
      exception.slotId === input.slotId,
  );

  const nextException: CampaignException = existing
    ? {
        ...existing,
        reason: input.reason,
      }
    : {
        id: createId(),
        campaignId: input.campaignId,
        studentId: input.studentId,
        slotId: input.slotId,
        reason: input.reason,
        createdAt: nowIso(),
      };

  if (existing) {
    Object.assign(existing, nextException);
  } else {
    store.exceptions.push(nextException);
  }

  recordAuditLog(store, {
    entityType: "campaign_exception",
    entityId: nextException.id,
    action: existing ? "placement_exception_updated" : "placement_exception_recorded",
    actor,
    details: {
      campaignId: input.campaignId,
      studentId: input.studentId,
      slotId: input.slotId,
    },
  });

  return nextException;
}
