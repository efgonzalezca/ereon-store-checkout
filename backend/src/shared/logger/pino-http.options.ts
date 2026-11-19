import { IncomingMessage, ServerResponse } from 'node:http';
import { Options } from 'pino-http';
import { resolveTraceId, TRACE_ID_HEADER } from './trace-id';

const SENSITIVE_KEYS = [
  'pan',
  'cvc',
  'cvv',
  'cardNumber',
  'card_number',
  'number',
  'authorization',
  'apiKey',
  'api_key',
  'password',
  'privateKey',
  'publicKey',
  'integrityKey',
  'acceptance_token',
  'accept_personal_auth',
];

export const REDACT_PATHS = SENSITIVE_KEYS.flatMap((key) => [
  key,
  `*.${key}`,
  `*.*.${key}`,
]);

export const REDACT_CENSOR = '[REDACTED]';

export function buildPinoHttpOptions(level: string): Options {
  return {
    level,
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const traceId = resolveTraceId(req.headers['x-trace-id']);
      res.setHeader(TRACE_ID_HEADER, traceId);
      return traceId;
    },
    customProps: (req: IncomingMessage) => ({
      traceId: (req as IncomingMessage & { id: string }).id,
    }),
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR },
    serializers: {
      req: (req: { method: string; url: string }) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  };
}
