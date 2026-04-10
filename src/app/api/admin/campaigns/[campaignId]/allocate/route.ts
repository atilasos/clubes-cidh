import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/server/auth/admin-guard";
import { commitCampaignAllocation, previewCampaignAllocation } from "@/server/services/campaign-operations-service";
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
    const body = (await request.json().catch(() => ({}))) as { commit?: boolean };

    const result = await withStore((store) =>
      body.commit ? commitCampaignAllocation(store, campaignId, "admin") : previewCampaignAllocation(store, campaignId),
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível executar a distribuição." },
      { status: 400 },
    );
  }
}
