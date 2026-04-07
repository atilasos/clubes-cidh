import { archiveCampaign } from "@/server/services/archive-service";
import { incrementMetric, recordAuditLog } from "@/server/services/audit-log-service";
import { allocateUnplacedStudents } from "@/server/services/allocation-service";
import { getClubCapacity } from "@/server/services/capacity-service";
import { syncCampaignStatus } from "@/server/services/campaign-service";
import { getEligibleTimeSlotsForStudent } from "@/server/services/eligibility-service";
import { generateCampaignDocuments } from "@/server/services/pdf-service";
import { createId, invariant, nowIso } from "@/server/lib/utils";
import { PersistedStoreError } from "@/server/store/db";
import { DataStore } from "@/server/types";

function buildAllocationPreview(store: DataStore, campaignId: string) {
  const campaign = syncCampaignStatus(store, campaignId);
  invariant(campaign.status === "closed", "A campanha tem de estar fechada antes da distribuição automática.");

  const clubs = store.clubs.filter((club) => club.campaignId === campaignId);
  const placements = store.placements.filter((placement) => placement.campaignId === campaignId);
  const placementKeys = new Set(placements.map((placement) => `${placement.studentId}:${placement.slotId}`));
  const exceptionKeys = new Set(
    store.exceptions
      .filter((exception) => exception.campaignId === campaignId)
      .map((exception) => `${exception.studentId}:${exception.slotId}`),
  );

  const students = store.students
    .map((student) => ({
      id: student.id,
      name: student.name,
      eligibleSlotIds: getEligibleTimeSlotsForStudent(store, campaign, student)
        .map((slot) => slot.id)
        .filter((slotId) => !placementKeys.has(`${student.id}:${slotId}`) && !exceptionKeys.has(`${student.id}:${slotId}`)),
    }))
    .filter((student) => student.eligibleSlotIds.length > 0);

  return allocateUnplacedStudents({
    students,
    clubs: clubs.map((club) => ({
      id: club.id,
      slotId: club.slotId,
      name: club.name,
      defaultCapacity: getClubCapacity(store, club),
    })),
    existingPlacements: placements.map((placement) => ({
      studentId: placement.studentId,
      clubId: placement.clubId,
      slotId: placement.slotId,
    })),
    studentClubHistory: store.history
      .filter((entry) => entry.schoolYear === campaign.schoolYear)
      .map((entry) => ({
        studentId: entry.studentId,
        clubId: entry.clubId,
        semester: entry.semester === 1 ? "S1" : "S2",
        schoolYear: entry.schoolYear,
      })),
    semester: campaign.semester === 1 ? "S1" : "S2",
    schoolYear: campaign.schoolYear,
  });
}

export function previewCampaignAllocation(store: DataStore, campaignId: string) {
  return {
    preview: buildAllocationPreview(store, campaignId),
    committed: false,
  };
}

export function commitCampaignAllocation(store: DataStore, campaignId: string, actor = "admin") {
  const campaign = syncCampaignStatus(store, campaignId);
  invariant(campaign.status === "closed", "A campanha tem de estar fechada antes da distribuição automática.");

  const preview = buildAllocationPreview(store, campaignId);

  for (const placement of preview) {
    store.placements.push({
      id: createId(),
      campaignId,
      studentId: placement.studentId,
      slotId: placement.slotId,
      clubId: placement.clubId,
      source: "allocation",
      reason: placement.reason,
      createdAt: nowIso(),
    });

    if (placement.repeatedClub) {
      incrementMetric(store, "allocation_repeat_override_total");
    }
  }

  recordAuditLog(store, {
    entityType: "campaign",
    entityId: campaignId,
    action: "allocation_committed",
    actor,
    details: {
      placements: preview.length,
      repeated: preview.filter((placement) => placement.repeatedClub).length,
    },
  });

  return {
    preview,
    committed: true,
  };
}

export async function finalizeCampaign(store: DataStore, campaignId: string, actor = "admin") {
  const campaign = syncCampaignStatus(store, campaignId);
  invariant(campaign.status !== "finalized" && campaign.status !== "archived", "A campanha já foi finalizada.");
  invariant(campaign.status === "closed", "A campanha tem de estar fechada antes da finalização.");

  const placementKeys = new Set(
    store.placements
      .filter((placement) => placement.campaignId === campaignId)
      .map((placement) => `${placement.studentId}:${placement.slotId}`),
  );

  const unresolvedTargets = store.students.flatMap((student) =>
    getEligibleTimeSlotsForStudent(store, campaign, student)
      .filter(
        (slot) =>
          !placementKeys.has(`${student.id}:${slot.id}`) &&
          !store.exceptions.some(
            (exception) =>
              exception.campaignId === campaignId &&
              exception.studentId === student.id &&
              exception.slotId === slot.id,
          ),
      )
      .map((slot) => ({ studentId: student.id, slotId: slot.id })),
  );

  invariant(
    unresolvedTargets.length === 0,
    "A campanha só pode ser finalizada quando todos os alunos estiverem colocados ou com exceção explícita.",
  );

  const archiveResult = archiveCampaign({
    campaignId,
    semester: campaign.semester === 1 ? "S1" : "S2",
    schoolYear: campaign.schoolYear,
    finalPlacements: store.placements
      .filter((placement) => placement.campaignId === campaignId)
      .map((placement) => ({
        studentId: placement.studentId,
        clubId: placement.clubId,
        semester: campaign.semester === 1 ? "S1" : "S2",
        schoolYear: campaign.schoolYear,
      })),
    priorArchive: null,
  });

  let generatedDocuments;
  try {
    generatedDocuments = await generateCampaignDocuments(store, campaignId);
  } catch (error) {
    incrementMetric(store, "pdf_generation_failures_total");
    throw new PersistedStoreError(error instanceof Error ? error.message : "Falha na geração de PDFs.");
  }

  if (campaign.semester === 1) {
    for (const placement of store.placements.filter((entry) => entry.campaignId === campaignId)) {
      const club = store.clubs.find((entry) => entry.id === placement.clubId);
      if (!club) continue;

      store.history.push({
        id: createId(),
        studentId: placement.studentId,
        slotId: placement.slotId,
        clubId: placement.clubId,
        clubName: club.name,
        schoolYear: campaign.schoolYear,
        semester: 1,
        createdAt: nowIso(),
      });
    }
  }

  store.documents = store.documents.filter((document) => document.campaignId !== campaignId);
  store.documents.push(...generatedDocuments);

  campaign.status = campaign.semester === 2 ? "archived" : "finalized";

  recordAuditLog(store, {
    entityType: "campaign",
    entityId: campaignId,
    action: "campaign_archived",
    actor,
    details: {
      visibility: archiveResult.visibility,
      generatedDocuments: generatedDocuments.length,
    },
  });

  return {
    ...archiveResult,
    generatedDocuments: generatedDocuments.map((document) => ({
      id: document.id,
      documentType: document.documentType,
      subjectId: document.subjectId,
      fileName: document.fileName,
      createdAt: document.createdAt,
    })),
  };
}

export function closeCampaign(store: DataStore, campaignId: string, actor = "admin") {
  const campaign = store.campaigns.find((entry) => entry.id === campaignId);
  invariant(campaign, "Campanha não encontrada.");
  invariant(campaign.status === "open", "Só é possível fechar campanhas abertas.");

  campaign.status = "closed";

  recordAuditLog(store, {
    entityType: "campaign",
    entityId: campaignId,
    action: "campaign_closed",
    actor,
    details: {
      closedAt: nowIso(),
    },
  });

  return campaign;
}

export function openCampaign(store: DataStore, campaignId: string, actor = "admin") {
  const campaign = syncCampaignStatus(store, campaignId, actor);
  invariant(campaign.status === "draft", "Só é possível abrir campanhas em rascunho.");

  campaign.status = "open";

  recordAuditLog(store, {
    entityType: "campaign",
    entityId: campaignId,
    action: "campaign_opened",
    actor,
    details: {
      openedAt: nowIso(),
    },
  });

  return campaign;
}
