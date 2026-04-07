import { NextRequest, NextResponse } from "next/server";
import { requestRemoteKey } from "@/server/lib/security";
import { identifyStudentForCampaign } from "@/server/services/enrollment-service";

type RouteContext = {
  params: Promise<{
    campaignSlug: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { campaignSlug } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await request.json()) as { identifier: string; accessCode: string })
    : (() => {
        return request.formData().then((formData) => ({
          identifier: String(formData.get("identifier") ?? ""),
          accessCode: String(formData.get("accessCode") ?? ""),
        }));
      })();
  const resolvedBody = await body;

  try {
    const result = await identifyStudentForCampaign(
      campaignSlug,
      resolvedBody.identifier,
      resolvedBody.accessCode,
      requestRemoteKey(request.headers),
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível identificar o aluno." },
      { status: 400 },
    );
  }
}
