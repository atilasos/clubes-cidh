import { NextResponse } from "next/server";
import { exportCampaignAccessPackage } from "@/server/services/campaign-service";
import { withStore } from "@/server/store/db";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { baseUrl?: string; actor?: string };

  const exportPackage = await withStore((store) =>
    exportCampaignAccessPackage(store, campaignId, body.baseUrl ?? "http://localhost:3000", body.actor),
  );

  return NextResponse.json(exportPackage);
}
