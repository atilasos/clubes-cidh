import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "clubes_admin_session";

function hash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function expectedPassword() {
  return process.env.ADMIN_PASSWORD ?? "admin123";
}

function sessionValue() {
  return hash(`clubes:${expectedPassword()}`);
}

export function isValidAdminPassword(password: string) {
  return password === expectedPassword();
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  return store.get(ADMIN_SESSION_COOKIE)?.value === sessionValue();
}

export function isAdminRequest(request: NextRequest) {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value === sessionValue();
}

export function createAdminCookieValue() {
  return sessionValue();
}

export const adminCookieName = ADMIN_SESSION_COOKIE;
