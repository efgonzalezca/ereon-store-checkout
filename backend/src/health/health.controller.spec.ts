import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports ok with uptime and an ISO timestamp', () => {
    const result = new HealthController().check();

    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThan(0);
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
