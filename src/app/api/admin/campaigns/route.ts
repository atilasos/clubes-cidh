import { NextResponse } from "next/server";
import { createCampaign } from "@/server/services/campaign-service";
import { getDashboardData } from "@/server/services/dashboard-service";
import { withStore } from "@/server/store/db";

export async function GET() {
  const dashboard = await getDashboardData();
  return NextResponse.json(dashboard.campaigns);
}

export async function POST(request: Request) {
  const body = await request.json();
  const campaign = await withStore((store) => createCampaign(store, body));
  return NextResponse.json(campaign, { status: 201 });
}
