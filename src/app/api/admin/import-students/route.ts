import { NextResponse } from "next/server";
import { importStudents } from "@/server/services/student-import-service";
import { withStore } from "@/server/store/db";

export async function POST(request: Request) {
  const body = (await request.json()) as { csv?: string; students?: Array<Record<string, string>>; actor?: string };
  const result = await withStore((store) => importStudents(store, body));

  return NextResponse.json(result);
}
