import { NextResponse } from "next/server";
import { submitEnrollmentChoice } from "@/server/services/enrollment-service";

type RouteContext = {
  params: Promise<{
    campaignSlug: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { campaignSlug } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await request.json()) as {
        studentId: string;
        accessCode: string;
        choices: Array<{ slotId: string; clubId: string }>;
      })
    : (() =>
        request.formData().then((formData) => ({
          studentId: String(formData.get("studentId") ?? ""),
          accessCode: String(formData.get("accessCode") ?? ""),
          choices: JSON.parse(String(formData.get("choices") ?? "[]")) as Array<{ slotId: string; clubId: string }>,
        })))();
  const resolvedBody = await body;

  try {
    const result = await submitEnrollmentChoice({
      campaignSlug,
      studentId: resolvedBody.studentId,
      accessCode: resolvedBody.accessCode,
      choices: resolvedBody.choices,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível submeter a inscrição." },
      { status: 400 },
    );
  }
}
