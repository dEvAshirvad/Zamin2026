import request from 'supertest';
import { describe, expect, it } from 'vitest';

import createApp from '@/configs/serverConfig';

describe('serverConfig HTTP surface', () => {
  const app = createApp();

  it('serves liveness on /health and /healthz', async () => {
    for (const path of ['/health', '/healthz']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.headers['x-request-id']).toBeTruthy();
    }
  });

  it('serves readiness on /readyz without internal token', async () => {
    const res = await request(app).get('/readyz');
    expect([200, 503]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toMatch(/ready|not_ready/);
  });

  it('returns normalized 404 error shape', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBeTruthy();
    expect(res.body.requestId).toBeTruthy();
  });
});
