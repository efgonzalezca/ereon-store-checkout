import { resolveClientIp } from './client-ip';

describe('resolveClientIp', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['2001:db8::1', '2001:db8::1'],
    ['not-an-ip', null],
    ['', null],
    [undefined, null],
  ])('resolves %p -> %p', (ip, expected) => {
    expect(resolveClientIp(ip)).toBe(expected);
  });
});
