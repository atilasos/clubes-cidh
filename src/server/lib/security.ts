import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Student } from "@/server/types";

type AttemptWindow = { count: number; expiresAt: number };

const attempts = new Map<string, AttemptWindow>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function maskSensitiveValue(value?: string) {
  if (!value) return undefined;
  if (value.length <= 4) return "*".repeat(value.length);
  return `${value.slice(0, 2)}${"*".repeat(Math.max(2, value.length - 4))}${value.slice(-2)}`;
}

export function maskSensitiveIdentifier(value?: string) {
  if (!value) return undefined;
  if (/^\d{9}$/.test(value)) {
    return `${value.slice(0, 3)}***${value.slice(-3)}`;
  }
  if (value.length <= 8) {
    return maskSensitiveValue(value);
  }
  return `${value.slice(0, 4)}${"*".repeat(Math.max(2, value.length - 8))}${value.slice(-4)}`;
}

export function normalizeIdentifier(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function studentMatchesIdentifier(student: Student, identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  return [student.cc, student.nif, student.studentNumber]
    .filter(Boolean)
    .map((entry) => normalizeIdentifier(entry!))
    .includes(normalized);
}

export function generateAccessCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function issueCampaignAccessCode(input: {
  campaignId: string;
  studentId: string;
  ttlMinutes?: number;
  code?: string;
}) {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + (input.ttlMinutes ?? 15) * 60 * 1000;
  const code = (input.code ?? generateAccessCode()).slice(0, 6).toUpperCase();

  return {
    campaignId: input.campaignId,
    studentId: input.studentId,
    code,
    expiresAt: new Date(expiresAt).toISOString(),
    async verify(providedCode: string) {
      if (Date.now() > expiresAt) {
        return false;
      }
      return codesMatch(code, providedCode);
    },
  };
}

function registerFailureForWindow(store: Map<string, AttemptWindow>, key: string, windowMs: number, maxAttempts: number) {
  const current = store.get(key);
  const now = Date.now();
  if (!current || current.expiresAt < now) {
    const next = { count: 1, expiresAt: now + windowMs };
    store.set(key, next);
    return { blocked: false, remaining: Math.max(0, maxAttempts - next.count), expiresAt: next.expiresAt };
  }

  const nextCount = current.count + 1;
  const next = { count: nextCount, expiresAt: current.expiresAt };
  store.set(key, next);

  return {
    blocked: nextCount >= maxAttempts,
    remaining: Math.max(0, maxAttempts - nextCount),
    expiresAt: next.expiresAt,
  };
}

export function consumeAccessCodeAttempt(input?: {
  windowMinutes?: number;
  maxAttempts?: number;
  store?: Map<string, AttemptWindow>;
}) {
  const windowMs = (input?.windowMinutes ?? WINDOW_MS / 60_000) * 60_000;
  const maxAttempts = input?.maxAttempts ?? MAX_ATTEMPTS;
  const store = input?.store ?? attempts;

  return {
    async registerFailure(key: string) {
      return registerFailureForWindow(store, key, windowMs, maxAttempts);
    },
    clear(key: string) {
      store.delete(key);
    },
  };
}

export function requireRateLimitWindow(key: string) {
  const result = registerFailureForWindow(attempts, key, WINDOW_MS, MAX_ATTEMPTS);
  if (result.blocked) {
    throw new Error("Demasiadas tentativas falhadas. Tente novamente mais tarde.");
  }
}

export function clearRateLimitWindow(key: string) {
  attempts.delete(key);
}

export function codesMatch(actualCode: string, providedCode: string) {
  const left = digest(actualCode.trim().toUpperCase());
  const right = digest(providedCode.trim().toUpperCase());
  return left.length === right.length && timingSafeEqual(left, right);
}
