export type EmailError = 'required' | 'invalid_email';
export type PhoneError = 'required' | 'invalid_phone';

export function validateEmail(value: string): EmailError | null {
  const email = value.trim();
  if (email === '') return 'required';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'invalid_email';
}

export function validatePhone(value: string): PhoneError | null {
  const phone = value.replace(/[\s()-]/g, '');
  if (phone === '') return 'required';
  return /^\+?\d{7,15}$/.test(phone) ? null : 'invalid_phone';
}
