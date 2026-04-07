import { NextResponse } from "next/server";
import { allocateUnplacedStudents } from "@/server/services/allocation-service";
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
  const body = (await request.json().catch(() => ({}))) as { commit?: boolean; actor?: string };

  const result = await withStore((store) => {
    const campaign = store.campaigns.find((entry) => entry.id === campaignId);
    invariant(campaign, "Campanha não encontrada.");

    const clubs = store.clubs.filter((club) => club.campaignId === campaignId);
    const placedStudentIds = new Set(
      store.placements.filter((placement) => placement.campaignId === campaignId).map((placement) => placement.studentId),
    );
    const students = store.students.filter((student) => !placedStudentIds.has(student.id));

    const preview = allocateUnplacedStudents({
      students: students.map((student) => ({ id: student.id, name: student.name })),
      clubs: clubs.map((club) => ({
        id: club.id,
        slotId: club.slotId,
        name: club.name,
        defaultCapacity: campaign.defaultCapacity,
        manualCapacity: club.capacityOverride ?? undefined,
      })),
      existingPlacements: store.placements
        .filter((placement) => placement.campaignId === campaignId)
        .map((placement) => ({
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

    if (body.commit) {
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
      }

      recordAuditLog(store, {
        entityType: "campaign",
        entityId: campaignId,
        action: "allocation_committed",
        actor: body.actor ?? "admin",
        details: {
          placements: preview.length,
        },
      });
    }

    return { preview, committed: Boolean(body.commit) };
  });

  return NextResponse.json(result);
}
