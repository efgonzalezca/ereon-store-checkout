import { isIP } from 'node:net';

const IPV4_MAPPED_PREFIX = '::ffff:';

export function resolveClientIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const address = ip.startsWith(IPV4_MAPPED_PREFIX)
    ? ip.slice(IPV4_MAPPED_PREFIX.length)
    : ip;
  return isIP(address) === 0 ? null : address;
}
