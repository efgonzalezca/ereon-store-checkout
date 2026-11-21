import { randomUUID } from 'node:crypto';

export const TRACE_ID_HEADER = 'X-Trace-Id';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveTraceId(header: string | string[] | undefined): string {
  const candidate = Array.isArray(header) ? header[0] : header;
  return candidate && UUID_PATTERN.test(candidate) ? candidate : randomUUID();
}
