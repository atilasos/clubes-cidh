import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/server/auth/admin-guard";
import { finalizeCampaign } from "@/server/services/campaign-operations-service";
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
    await request.json().catch(() => ({}));

    const result = await withStore((store) => finalizeCampaign(store, campaignId, "admin"));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível finalizar a campanha." },
      { status: 400 },
    );
  }
}
