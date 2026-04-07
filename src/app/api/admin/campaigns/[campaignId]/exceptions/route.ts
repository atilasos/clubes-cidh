import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/server/auth/admin-guard";
import { recordCampaignException } from "@/server/services/campaign-service";
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
    const body = (await request.json()) as {
      studentId: string;
      slotId: string;
      reason: string;
      actor?: string;
    };

    const exception = await withStore((store) =>
      recordCampaignException(
        store,
        {
          campaignId,
          studentId: body.studentId,
          slotId: body.slotId,
          reason: body.reason,
        },
        body.actor,
      ),
    );

    return NextResponse.json(exception, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível registar a exceção." },
      { status: 400 },
    );
  }
}
