/**
 * Converts an array of transaction rows into a CSV string.
 * Used by GET /api/analytics/export/csv — a plain CSV feed that Power BI,
 * Excel or Google Sheets can import directly.
 */
function toCSV(rows) {
  const headers = ['id', 'date', 'type', 'category_id', 'amount', 'description'];

  if (!rows || rows.length === 0) {
    return `${headers.join(',')}\n`;
  }

  const lines = [headers.join(',')];

  for (const row of rows) {
    const line = headers.map((h) => {
      let value = row[h] === null || row[h] === undefined ? '' : String(row[h]);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    lines.push(line.join(','));
  }

  return lines.join('\n');
}

module.exports = { toCSV };
