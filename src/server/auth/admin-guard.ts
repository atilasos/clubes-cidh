import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { adminCookieName, createAdminCookieValue, isAdminAuthenticated, isAdminRequest, isValidAdminPassword } from "@/server/auth/admin-session";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  };
}

export async function requireAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
}

export function requireAdminApi(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Autenticação administrativa obrigatória." }, { status: 401 });
  }

  return null;
}

export async function createAdminSession(password: string) {
  if (!isValidAdminPassword(password)) {
    throw new Error("Palavra-passe administrativa inválida.");
  }

  const store = await cookies();
  store.set(adminCookieName, createAdminCookieValue(), cookieOptions());
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(adminCookieName, "", { ...cookieOptions(), maxAge: 0 });
}
