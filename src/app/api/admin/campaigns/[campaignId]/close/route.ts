import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/server/auth/admin-guard";
import { closeCampaign, openCampaign } from "@/server/services/campaign-operations-service";
import { withStore } from "@/server/store/db";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const { campaignId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { actor?: string; action?: "open" | "close" };
    const campaign = await withStore((store) =>
      body.action === "open" ? openCampaign(store, campaignId, body.actor) : closeCampaign(store, campaignId, body.actor),
    );
    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível fechar a campanha." },
      { status: 400 },
    );
  }
}
