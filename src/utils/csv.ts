function escapeCsvValue(value: unknown): string {
  const normalized = value == null ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function serializeCsv(headers: readonly string[], rows: readonly unknown[][]): string {
  return [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(',')),
  ].join('\n');
}
