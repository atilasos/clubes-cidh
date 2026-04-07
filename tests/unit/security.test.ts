import { describe, expect, it, vi } from 'vitest';

import { consumeAccessCodeAttempt, issueCampaignAccessCode, maskSensitiveIdentifier } from '../../src/server/lib/security';

describe('security helpers', () => {
  it('masks CC and NIF values before they can appear in logs or UI', () => {
    expect(maskSensitiveIdentifier('123456780AA1')).toBe('1234****0AA1');
    expect(maskSensitiveIdentifier('123456789')).toBe('123***789');
  });

  it('issues access codes that expire and validate once inside the allowed window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T10:00:00.000Z'));

    const issued = await issueCampaignAccessCode({ campaignId: 'campaign-1', studentId: 'ana', ttlMinutes: 15 });

    expect(issued.code).toHaveLength(6);

    vi.setSystemTime(new Date('2026-04-07T10:10:00.000Z'));
    await expect(issued.verify(issued.code)).resolves.toBe(true);

    vi.setSystemTime(new Date('2026-04-07T10:16:00.000Z'));
    await expect(issued.verify(issued.code)).resolves.toBe(false);

    vi.useRealTimers();
  });

  it('blocks identification after repeated failed attempts', async () => {
    const limiter = consumeAccessCodeAttempt({ windowMinutes: 5, maxAttempts: 3 });

    expect(await limiter.registerFailure('ip:127.0.0.1')).toMatchObject({ blocked: false, remaining: 2 });
    expect(await limiter.registerFailure('ip:127.0.0.1')).toMatchObject({ blocked: false, remaining: 1 });
    expect(await limiter.registerFailure('ip:127.0.0.1')).toMatchObject({ blocked: true, remaining: 0 });
  });
});
