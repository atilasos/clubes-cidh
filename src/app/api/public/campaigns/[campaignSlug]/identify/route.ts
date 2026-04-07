import { NextResponse } from "next/server";
import { identifyStudentForCampaign } from "@/server/services/enrollment-service";

type RouteContext = {
  params: Promise<{
    campaignSlug: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { campaignSlug } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await request.json()) as { identifier: string; accessCode: string; remoteKey?: string })
    : (() => {
        return request.formData().then((formData) => ({
          identifier: String(formData.get("identifier") ?? ""),
          accessCode: String(formData.get("accessCode") ?? ""),
          remoteKey: String(formData.get("remoteKey") ?? "public"),
        }));
      })();
  const resolvedBody = await body;

  try {
    const result = await identifyStudentForCampaign(
      campaignSlug,
      resolvedBody.identifier,
      resolvedBody.accessCode,
      resolvedBody.remoteKey ?? "public",
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível identificar o aluno." },
      { status: 400 },
    );
  }
}
