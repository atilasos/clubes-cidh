import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/server/auth/admin-guard";
import { resolveAppBaseUrl } from "@/server/lib/runtime-config";
import { exportCampaignAccessPackage } from "@/server/services/campaign-service";
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
    const baseUrl = resolveAppBaseUrl(request.headers);

    const exportPackage = await withStore((store) =>
      exportCampaignAccessPackage(store, campaignId, baseUrl, "admin"),
    );

    return NextResponse.json(exportPackage);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível exportar os acessos." },
      { status: 400 },
    );
  }
}
