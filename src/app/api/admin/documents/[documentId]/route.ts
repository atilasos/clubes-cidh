import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/server/auth/admin-guard";
import { readStore } from "@/server/store/db";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { documentId } = await context.params;
  const store = await readStore();
  const document = store.documents.find((entry) => entry.id === documentId);
  if (!document) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(document.contentsBase64, "base64"), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${document.fileName}"`,
    },
  });
}
