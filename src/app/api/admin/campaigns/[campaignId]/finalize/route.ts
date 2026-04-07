import { NextResponse } from "next/server";
import { archiveCampaign } from "@/server/services/archive-service";
import { recordAuditLog } from "@/server/services/audit-log-service";
import { createId, invariant, nowIso } from "@/server/lib/utils";
import { withStore } from "@/server/store/db";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { actor?: string };

  const result = await withStore((store) => {
    const campaign = store.campaigns.find((entry) => entry.id === campaignId);
    invariant(campaign, "Campanha não encontrada.");

    const placedStudentIds = new Set(
      store.placements.filter((placement) => placement.campaignId === campaignId).map((placement) => placement.studentId),
    );
    const exceptedStudentIds = new Set(
      store.exceptions.filter((exception) => exception.campaignId === campaignId).map((exception) => exception.studentId),
    );
    const unresolvedStudents = store.students.filter(
      (student) => !placedStudentIds.has(student.id) && !exceptedStudentIds.has(student.id),
    );
    invariant(
      unresolvedStudents.length === 0,
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

    campaign.status = campaign.semester === 2 ? "archived" : "finalized";

    recordAuditLog(store, {
      entityType: "campaign",
      entityId: campaignId,
      action: "campaign_archived",
      actor: body.actor ?? "admin",
      details: {
        visibility: archiveResult.visibility,
      },
    });

    return archiveResult;
  });

  return NextResponse.json(result);
}
