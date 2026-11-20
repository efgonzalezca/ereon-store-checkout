import { createHash } from 'node:crypto';

export function integritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integrityKey: string,
): string {
  return createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${integrityKey}`)
    .digest('hex');
}
