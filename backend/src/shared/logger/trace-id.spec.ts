import { resolveTraceId } from './trace-id';

describe('resolveTraceId', () => {
  const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

  it('keeps a valid UUID, including the first of repeated headers', () => {
    expect(resolveTraceId(uuid)).toBe(uuid);
    expect(resolveTraceId([uuid, 'other'])).toBe(uuid);
  });

  it('generates a fresh UUID for missing or invalid values', () => {
    for (const header of [undefined, 'not-a-uuid', '<script>x</script>']) {
      expect(resolveTraceId(header)).toMatch(/^[0-9a-f-]{36}$/);
      expect(resolveTraceId(header)).not.toBe(header);
    }
  });
});
