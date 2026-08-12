import request from 'supertest';
import { describe, expect, it } from 'vitest';

import createApp from '@/configs/serverConfig';

describe('idempotency middleware', () => {
  it('allows GET without idempotency key', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
