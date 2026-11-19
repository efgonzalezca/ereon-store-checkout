import {
  createServer,
  IncomingMessage,
  Server,
  ServerResponse,
} from 'node:http';
import { Writable } from 'node:stream';
import pinoHttp, { HttpLogger } from 'pino-http';
import request from 'supertest';
import { buildPinoHttpOptions, REDACT_CENSOR } from './pino-http.options';

describe('buildPinoHttpOptions', () => {
  const traceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  let lines: Array<Record<string, unknown>>;
  let server: Server;
  let httpLogger: HttpLogger<IncomingMessage, ServerResponse>;

  beforeEach(() => {
    lines = [];
    const stream = new Writable({
      write(chunk: Buffer, _enc, done) {
        lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
        done();
      },
    });
    httpLogger = pinoHttp(buildPinoHttpOptions('info'), stream);
    server = createServer((req, res) => {
      httpLogger(req, res);
      res.end('ok');
    });
  });

  afterEach(() => {
    server.close();
  });

  it('includes the traceId from X-Trace-Id in every log line and echoes the header', async () => {
    const response = await request(server)
      .get('/api/health')
      .set('X-Trace-Id', traceId);

    expect(response.headers['x-trace-id']).toBe(traceId);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      traceId,
      level: 'info',
      req: { method: 'GET', url: '/api/health' },
      res: { statusCode: 200 },
    });
    expect(typeof lines[0].timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(lines[0].timestamp as string))).toBe(false);
  });

  it('redacts sensitive fields in application logs', async () => {
    await request(server).get('/');
    lines.length = 0;

    httpLogger.logger.info(
      {
        pan: '4242424242424242',
        card: { number: '4242424242424242', cvc: '123' },
        payload: { card: { cvc: '999' } },
        authorization: 'Bearer abc',
        apiKey: 'key_test_mock',
        action: 'pay',
      },
      'payment attempt',
    );

    const [line] = lines;
    expect(line).toMatchObject({
      pan: REDACT_CENSOR,
      card: { number: REDACT_CENSOR, cvc: REDACT_CENSOR },
      payload: { card: { cvc: REDACT_CENSOR } },
      authorization: REDACT_CENSOR,
      apiKey: REDACT_CENSOR,
      action: 'pay',
    });
    expect(JSON.stringify(line)).not.toMatch(/4242|123|999|key_test_mock/);
  });
});
