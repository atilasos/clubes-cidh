import { getCampaignBySlug, validateCampaignAccessCode } from "@/server/services/campaign-service";
import { incrementMetric, recordAuditLog } from "@/server/services/audit-log-service";
import { getEligibleClubOptionsForStudent } from "@/server/services/eligibility-service";
import { clearRateLimitWindow, maskSensitiveValue, requireRateLimitWindow, studentMatchesIdentifier } from "@/server/lib/security";
import { createId, invariant, nowIso } from "@/server/lib/utils";
import { PersistedStoreError, readStore, withStore } from "@/server/store/db";
import { DataStore, EnrollmentSubmission, IdentifiedStudentView } from "@/server/types";

type SubmissionCapacity = {
  total: number;
  reserved: number;
  remaining: number;
};

type SubmissionChoice = {
  slotId: string;
  clubId: string;
};

type CompetingSubmission = {
  studentId: string;
  submittedAt: string;
  choices: SubmissionChoice[];
};

const PUBLIC_IDENTIFICATION_FAILURE_MESSAGE = "Não foi possível validar o acesso do aluno.";

function buildIdentifiedStudentView(input: {
  campaign: NonNullable<ReturnType<typeof getCampaignBySlug>>;
  store: Awaited<ReturnType<typeof readStore>>;
  student: Awaited<ReturnType<typeof readStore>>["students"][number];
}): IdentifiedStudentView {
  return {
    campaign: input.campaign,
    student: {
      id: input.student.id,
      name: input.student.name,
      grade: input.student.grade,
      className: input.student.className,
      studentNumber: input.student.studentNumber,
      maskedCc: maskSensitiveValue(input.student.cc),
      maskedNif: maskSensitiveValue(input.student.nif),
    },
    options: getEligibleClubOptionsForStudent(input.store, input.campaign, input.student),
  };
}

export async function submitEnrollmentChoices(input: {
  campaignId: string;
  studentId: string;
  accessCode: string;
  submittedAt: string;
  choices: SubmissionChoice[];
  existingSubmissions: Array<{ studentId: string; campaignId: string }>;
  capacities: Record<string, SubmissionCapacity>;
  competingSubmissions?: CompetingSubmission[];
}) {
  invariant(
    !input.existingSubmissions.some(
      (submission) => submission.studentId === input.studentId && submission.campaignId === input.campaignId,
    ),
    "Duplicate submission for the same student and campaign.",
  );

  const slotIds = input.choices.map((choice) => choice.slotId);
  invariant(new Set(slotIds).size === slotIds.length, "Cannot choose more than one club in the same slot.");

  const capacities = structuredClone(input.capacities);
  const competitors = input.competingSubmissions ?? [];
  const ordered = [
    {
      studentId: input.studentId,
      submittedAt: input.submittedAt,
      choices: input.choices,
      primary: true,
    },
    ...competitors.map((submission) => ({ ...submission, primary: false })),
  ].sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));

  const acceptedByStudent = new Map<string, SubmissionChoice[]>();
  const rejectedSubmissions: Array<{ studentId: string; reason: string }> = [];

  for (const submission of ordered) {
    let acceptedAllChoices = true;

    for (const choice of submission.choices) {
      const capacity = capacities[choice.clubId];
      if (!capacity || capacity.remaining <= 0) {
        acceptedAllChoices = false;
        rejectedSubmissions.push({
          studentId: submission.studentId,
          reason: "Capacity unavailable for the selected club.",
        });
        break;
      }
    }

    if (!acceptedAllChoices) continue;

    acceptedByStudent.set(submission.studentId, submission.choices);
    for (const choice of submission.choices) {
      capacities[choice.clubId].remaining -= 1;
    }
  }

  const acceptedChoices = acceptedByStudent.get(input.studentId);
  invariant(acceptedChoices, "Capacity unavailable for the selected club.");

  return {
    acceptedChoices,
    rejectedSubmissions: rejectedSubmissions.filter((submission) => submission.studentId !== input.studentId),
    capacities,
  };
}

export async function identifyStudentForCampaign(
  campaignSlug: string,
  identifier: string,
  accessCode: string,
  remoteKey: string,
): Promise<IdentifiedStudentView> {
  return withStore((store) => identifyStudentForCampaignInStore(store, campaignSlug, identifier, accessCode, remoteKey));
}

export function identifyStudentForCampaignInStore(
  store: DataStore,
  campaignSlug: string,
  identifier: string,
  accessCode: string,
  remoteKey: string,
): Promise<IdentifiedStudentView> {
  const campaign = getCampaignBySlug(store, campaignSlug);
  invariant(campaign, "Campanha não encontrada.");
  invariant(campaign.status === "open", "A campanha ainda não está aberta para inscrições.");

  const student = store.students.find((entry) => studentMatchesIdentifier(entry, identifier));
  if (!student) {
    requireRateLimitWindow(`${campaignSlug}:${remoteKey}`);
    incrementMetric(store, "campaign_identification_failures_total");
    throw new PersistedStoreError(PUBLIC_IDENTIFICATION_FAILURE_MESSAGE);
  }

  try {
    validateCampaignAccessCode(store, campaign.id, student.id, accessCode);
    clearRateLimitWindow(`${campaignSlug}:${remoteKey}`);
  } catch {
    requireRateLimitWindow(`${campaignSlug}:${remoteKey}`);
    incrementMetric(store, "campaign_identification_failures_total");
    throw new PersistedStoreError(PUBLIC_IDENTIFICATION_FAILURE_MESSAGE);
  }

  return Promise.resolve(buildIdentifiedStudentView({ campaign, store, student }));
}

export async function getStudentEnrollmentContext(
  campaignSlug: string,
  studentId: string,
  accessCode: string,
): Promise<IdentifiedStudentView> {
  const store = await readStore();
  return getStudentEnrollmentContextInStore(store, campaignSlug, studentId, accessCode);
}

export function getStudentEnrollmentContextInStore(
  store: DataStore,
  campaignSlug: string,
  studentId: string,
  accessCode: string,
): IdentifiedStudentView {
  const campaign = getCampaignBySlug(store, campaignSlug);
  invariant(campaign, "Campanha não encontrada.");
  invariant(campaign.status === "open", "A campanha ainda não está aberta para inscrições.");

  const student = store.students.find((entry) => entry.id === studentId);
  invariant(student, "Aluno não encontrado.");
  validateCampaignAccessCode(store, campaign.id, student.id, accessCode);

  return buildIdentifiedStudentView({ campaign, store, student });
}

export async function submitEnrollmentChoice(input: {
  campaignSlug: string;
  studentId: string;
  accessCode: string;
  choices: Array<{ slotId: string; clubId: string }>;
}) {
  return withStore((store) => submitEnrollmentChoiceInStore(store, input));
}

export function submitEnrollmentChoiceInStore(
  store: DataStore,
  input: {
    campaignSlug: string;
    studentId: string;
    accessCode: string;
    choices: Array<{ slotId: string; clubId: string }>;
  },
) {
  const campaign = getCampaignBySlug(store, input.campaignSlug);
  invariant(campaign, "Campanha não encontrada.");
  invariant(campaign.status === "open", "A campanha já não aceita inscrições.");

  const student = store.students.find((entry) => entry.id === input.studentId);
  invariant(student, "Aluno não encontrado.");
  validateCampaignAccessCode(store, campaign.id, student.id, input.accessCode);

  invariant(
    !store.submissions.some((submission) => submission.campaignId === campaign.id && submission.studentId === student.id),
    "O aluno já submeteu escolhas para esta campanha.",
  );

  const uniqueSlotIds = new Set(input.choices.map((choice) => choice.slotId));
  invariant(uniqueSlotIds.size === input.choices.length, "Não é possível escolher mais do que um clube por horário.");

  const availableOptions = getEligibleClubOptionsForStudent(store, campaign, student);
  for (const choice of input.choices) {
    const slotOption = availableOptions.find((entry) => entry.slot.id === choice.slotId);
    invariant(slotOption, "Escolha contém um horário não elegível.");
    const clubOption = slotOption.clubs.find((entry) => entry.id === choice.clubId);
    if (!clubOption || clubOption.remainingCapacity <= 0) {
      incrementMetric(store, "campaign_last_seat_race_total");
      throw new PersistedStoreError("Uma das vagas deixou de estar disponível. Atualize a página e tente novamente.");
    }
  }

  const submission: EnrollmentSubmission = {
    id: createId(),
    campaignId: campaign.id,
    studentId: student.id,
    submittedAt: nowIso(),
    status: "confirmed",
    choices: input.choices,
  };
  store.submissions.push(submission);

  for (const choice of input.choices) {
    store.placements.push({
      id: createId(),
      campaignId: campaign.id,
      studentId: student.id,
      slotId: choice.slotId,
      clubId: choice.clubId,
      source: "submission",
      reason: "Escolha confirmada por ordem de chegada.",
      createdAt: submission.submittedAt,
    });
  }

  recordAuditLog(store, {
    entityType: "enrollment_submission",
    entityId: submission.id,
    action: "placement_committed",
    actor: `student:${student.id}`,
    details: {
      choices: input.choices.length,
    },
  });

  return submission;
}
