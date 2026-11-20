import { CompactEncrypt, importSPKI } from 'jose';
import { CardData } from '../domain/payment-gateway.port';

const KEY_ALGORITHM = 'RSA-OAEP-256';
const CONTENT_ENCRYPTION = 'A256GCM';

export async function encryptCard(
  publicKeyPem: string,
  card: CardData,
): Promise<string> {
  const key = await importSPKI(publicKeyPem, KEY_ALGORITHM);
  const plaintext = JSON.stringify({
    number: card.number,
    cvc: card.cvc,
    exp_month: card.expMonth,
    exp_year: card.expYear,
    card_holder: card.holder,
  });

  return new CompactEncrypt(new TextEncoder().encode(plaintext))
    .setProtectedHeader({ alg: KEY_ALGORITHM, enc: CONTENT_ENCRYPTION })
    .encrypt(key);
}
