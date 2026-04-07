import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/server/auth/admin-guard";
import { createCampaign } from "@/server/services/campaign-service";
import { getDashboardData } from "@/server/services/dashboard-service";
import { withStore } from "@/server/store/db";

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const dashboard = await getDashboardData();
    return NextResponse.json(dashboard.campaigns);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível listar as campanhas." },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const campaign = await withStore((store) => createCampaign(store, body));
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível criar a campanha." },
      { status: 400 },
    );
  }
}
