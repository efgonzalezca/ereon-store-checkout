import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Server } from 'node:http';
import { IsString } from 'class-validator';
import request from 'supertest';
import { NotFoundError } from '../src/shared/rop/errors';
import { err, ok, Result } from '../src/shared/rop/result';
import { createTestApp } from './create-test-app';

class EchoDto {
  @IsString()
  name!: string;
}

@Controller('probe')
class ProbeController {
  @Post('echo')
  echo(@Body() dto: EchoDto): EchoDto {
    return dto;
  }

  @Get('boom')
  boom(): never {
    throw new Error('connection to db-host.internal:5432 refused');
  }

  @Get('missing')
  missing(): Result<never, NotFoundError> {
    return err(new NotFoundError('probe not found'));
  }

  @Get('found')
  found(): Result<{ id: number }> {
    return ok({ id: 1 });
  }
}

describe('App (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [ProbeController] });
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the health check with trace id and security headers', async () => {
    const traceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    const response = await request(server)
      .get('/api/health')
      .set('X-Trace-Id', traceId)
      .set('Origin', 'http://localhost:5173')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      uptime: expect.any(Number) as number,
      timestamp: expect.any(String) as string,
    });
    expect(response.headers['x-trace-id']).toBe(traceId);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'none'",
    );
    expect(response.headers['strict-transport-security']).toContain('max-age=');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  it('does not allow CORS for other origins', async () => {
    const { headers } = await request(server)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');

    expect(headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns 400 for extra or missing payload fields', async () => {
    await request(server)
      .post('/api/probe/echo')
      .send({ name: 'ok', extra: 'not allowed' })
      .expect(400);
    await request(server).post('/api/probe/echo').send({}).expect(400);
  });

  it('returns 500 without leaking the error or the stack trace', async () => {
    const response = await request(server).get('/api/probe/boom').expect(500);

    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('unwraps Ok and maps Err results through the ResultInterceptor', async () => {
    await request(server).get('/api/probe/found').expect(200, { id: 1 });
    await request(server).get('/api/probe/missing').expect(404, {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'probe not found',
    });
  });

  it('rate limits routes with 429 but never the health check', async () => {
    for (let i = 0; i < 10; i++) {
      await request(server).get('/api/health').expect(200);
    }

    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await request(server).get('/api/probe/found')).status);
    }

    expect(statuses).toContain(429);
  });
});
