function buildPaginationMeta({ page, limit, total }) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 10));
  const totalPages = Math.ceil(total / l) || 0;
  return {
    page: p,
    limit: l,
    total,
    totalPages,
    offset: (p - 1) * l,
    hasNext: p < totalPages,
    hasPrev: p > 1,
  };
}

module.exports = { buildPaginationMeta };
