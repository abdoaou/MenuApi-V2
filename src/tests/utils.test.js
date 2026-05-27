const { sanitizeValue } = require('../utils/sanitize');
const { buildPaginationMeta } = require('../utils/pagination');
const { generateApiKey, hashApiKey } = require('../utils/apiKey');

describe('sanitizeValue', () => {
  it('escapes HTML in strings', () => {
    expect(sanitizeValue('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('recursively sanitizes objects', () => {
    const out = sanitizeValue({ name: '<b>x</b>' });
    expect(out.name).toBe('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('buildPaginationMeta', () => {
  it('computes offset and pages', () => {
    const meta = buildPaginationMeta({ page: 2, limit: 10, total: 25 });
    expect(meta.page).toBe(2);
    expect(meta.totalPages).toBe(3);
    expect(meta.offset).toBe(10);
    expect(meta.hasNext).toBe(true);
    expect(meta.hasPrev).toBe(true);
  });
});

describe('apiKey utils', () => {
  it('generates keys with mk_ prefix and verifiable hash', () => {
    const { full, prefix, hash } = generateApiKey();
    expect(full.startsWith('mk_')).toBe(true);
    expect(prefix).toBe(full.slice(0, 12));
    expect(hashApiKey(full)).toBe(hash);
  });
});
