import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/server/auth/admin-guard";
import { importStudents } from "@/server/services/student-import-service";
import { withStore } from "@/server/store/db";

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? ((await request.json()) as { csv?: string; students?: Array<Record<string, string>>; actor?: string })
      : await request.formData().then(async (formData) => {
          const uploadedFile = formData.get("file");
          return {
            csv:
              (uploadedFile instanceof File ? await uploadedFile.text() : "") ||
              String(formData.get("csv") ?? ""),
            actor: String(formData.get("actor") ?? "admin"),
          };
        });
    const result = await withStore((store) => importStudents(store, body));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível importar os alunos." },
      { status: 400 },
    );
  }
}
