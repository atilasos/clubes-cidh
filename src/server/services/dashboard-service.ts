import { readStore } from "@/server/store/db";
import { DashboardData } from "@/server/types";

export async function getDashboardData(): Promise<DashboardData> {
  const store = await readStore();
  return {
    students: store.students,
    campaigns: store.campaigns.map((campaign) => ({
      ...campaign,
      slots: store.timeSlots.filter((slot) => slot.campaignId === campaign.id),
      clubs: store.clubs.filter((club) => club.campaignId === campaign.id),
      placements: store.placements.filter((placement) => placement.campaignId === campaign.id),
      exceptions: store.exceptions.filter((entry) => entry.campaignId === campaign.id),
    })),
    recentAuditLogs: store.auditLogs.slice(0, 20),
    metrics: store.metrics,
  };
}
