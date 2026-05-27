/** Map API status values to DB enum string ('active' | 'inactive'). */
function toDbStatus(status) {
  if (
    status === false ||
    status === 0 ||
    status === '0' ||
    status === 'inactive' ||
    status === 'false' ||
    status === 'disabled' ||
    status === 'off'
  ) {
    return 'inactive';
  }
  return 'active';
}

function fromDbStatus(status) {
  if (status === true || status === 'true' || status === 't' || status === 1 || status === '1') {
    return 'active';
  }
  if (status === false || status === 'false' || status === 'f' || status === 0 || status === '0') {
    return 'inactive';
  }
  if (status === 'active' || status === 'inactive') {
    return status;
  }
  return status ? 'active' : 'inactive';
}

function formatParentRow(row) {
  if (!row) return row;
  return { ...row, status: fromDbStatus(row.status) };
}

module.exports = { toDbStatus, fromDbStatus, formatParentRow };
