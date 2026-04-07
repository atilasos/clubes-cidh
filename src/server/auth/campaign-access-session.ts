import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { invariant } from "@/server/lib/utils";

const CAMPAIGN_ACCESS_COOKIE = "clubes_campaign_access";

type CampaignAccessSession = {
  campaignSlug: string;
  studentId: string;
  accessCode: string;
};

function sessionSecret() {
  return process.env.CAMPAIGN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "clubes-session-secret";
}

function signPayload(payload: string) {
  return createHash("sha256").update(`${payload}:${sessionSecret()}`).digest("hex");
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  };
}

export async function setCampaignAccessSession(session: CampaignAccessSession) {
  const store = await cookies();
  const payload = JSON.stringify(session);
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  const signedValue = `${encodedPayload}.${signPayload(encodedPayload)}`;
  store.set(CAMPAIGN_ACCESS_COOKIE, signedValue, cookieOptions());
}

export async function clearCampaignAccessSession() {
  const store = await cookies();
  store.set(CAMPAIGN_ACCESS_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function readCampaignAccessSession(expectedCampaignSlug: string) {
  const store = await cookies();
  const raw = store.get(CAMPAIGN_ACCESS_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  const [encodedPayload, signature] = raw.split(".");
  if (!encodedPayload || !signature || signPayload(encodedPayload) !== signature) {
    return null;
  }

  const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as CampaignAccessSession;
  invariant(parsed.campaignSlug === expectedCampaignSlug, "Sessão da campanha inválida.");
  return parsed;
}
