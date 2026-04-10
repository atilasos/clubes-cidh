function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function requireProductionEnv(name: string) {
  const value = readEnv(name);
  if (value) {
    return value;
  }

  throw new Error(`A variável ${name} é obrigatória em produção.`);
}

function normalizeBaseUrl(value: string) {
  const normalized = new URL(value);
  const pathname = normalized.pathname.replace(/\/$/, "");
  return `${normalized.origin}${pathname}`;
}

export function getAdminPassword() {
  const configured = readEnv("ADMIN_PASSWORD");
  if (configured) {
    return configured;
  }

  if (isProductionRuntime()) {
    return requireProductionEnv("ADMIN_PASSWORD");
  }

  return "admin123";
}

export function getCampaignSessionSecret() {
  const configured = readEnv("CAMPAIGN_SESSION_SECRET");
  if (configured) {
    return configured;
  }

  if (isProductionRuntime()) {
    return requireProductionEnv("CAMPAIGN_SESSION_SECRET");
  }

  return readEnv("ADMIN_PASSWORD") ?? "clubes-session-secret";
}

export function resolveAppBaseUrl(headers?: Headers) {
  const configured = readEnv("APP_BASE_URL");
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  if (isProductionRuntime()) {
    return requireProductionEnv("APP_BASE_URL");
  }

  const host = headers?.get("x-forwarded-host") ?? headers?.get("host") ?? "localhost:3000";
  const protocol = headers?.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return normalizeBaseUrl(`${protocol}://${host}`);
}
