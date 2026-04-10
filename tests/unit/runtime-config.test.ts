import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAdminPassword, getCampaignSessionSecret, resolveAppBaseUrl } from '../../src/server/lib/runtime-config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('runtime config', () => {
  it('fails closed in production when required secrets and base URL are missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_PASSWORD', '');
    vi.stubEnv('CAMPAIGN_SESSION_SECRET', '');
    vi.stubEnv('APP_BASE_URL', '');

    expect(() => getAdminPassword()).toThrow(/ADMIN_PASSWORD/i);
    expect(() => getCampaignSessionSecret()).toThrow(/CAMPAIGN_SESSION_SECRET/i);
    expect(() => resolveAppBaseUrl()).toThrow(/APP_BASE_URL/i);
  });

  it('allows local fallbacks outside production', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ADMIN_PASSWORD', '');
    vi.stubEnv('CAMPAIGN_SESSION_SECRET', '');
    vi.stubEnv('APP_BASE_URL', '');

    expect(getAdminPassword()).toBe('admin123');
    expect(getCampaignSessionSecret()).toBe('clubes-session-secret');
    expect(resolveAppBaseUrl(new Headers({ host: 'localhost:3000' }))).toBe('http://localhost:3000');
  });

  it('prefers the configured public base URL when present', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_BASE_URL', 'https://portal.example.edu/clubes/');

    expect(resolveAppBaseUrl(new Headers({ host: 'localhost:3000' }))).toBe('https://portal.example.edu/clubes');
  });
});
