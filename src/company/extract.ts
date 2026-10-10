import { FIELDS, type CompanyEvidence, type ExtractRow } from './types.ts';

/** CSV parser supports quoted commas, escaped quotes and newlines. No formula execution. */
export function parseCsv(raw: string): string[][] {
  raw = raw.replace(/^\uFEFF/, '');
  const rows: string[][] = []; let row: string[] = [], value = '', quoted = false, endedQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const character = raw[i]!;
    if (quoted) { if (character === '"' && raw[i + 1] === '"') { value += '"'; i++; } else if (character === '"') { quoted = false; endedQuote = true; } else value += character; }
    else if (character === '"') { if (value || endedQuote) throw new Error('CSV: Unexpected quote.'); quoted = true; }
    else if (character === ',') { row.push(value); value = ''; endedQuote = false; }
    else if (character === '\n' || character === '\r') { if (character === '\r' && raw[i + 1] === '\n') i++; row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = ''; endedQuote = false; }
    else { if (endedQuote) throw new Error('CSV: Text after closing quote.'); value += character; }
    if (rows.length > 10000) throw new Error('CSV: Maximum 10,000 rows.');
  }
  if (quoted) throw new Error('CSV: Unclosed quoted value.');
  row.push(value); if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function mapExtract(evidence: CompanyEvidence) {
  const parsed = parseCsv(evidence.csv); const header = parsed.shift() ?? [];
  if (new Set(header).size !== header.length || !FIELDS.every((key) => header.includes(evidence.mapping[key]))) throw new Error('CSV: Headers must be unique and include every mapped field.');
  const indices = Object.fromEntries(FIELDS.map((key) => [key, header.indexOf(evidence.mapping[key])])) as Record<typeof FIELDS[number], number>;
  const diagnostics: string[] = []; const rows: ExtractRow[] = []; const seen = new Map<string, string>(); let duplicates = 0;
  for (const [i, values] of parsed.entries()) {
    try {
      if (values.length !== header.length) throw new Error('Column count differs from header.');
      const result = Object.fromEntries(FIELDS.map((key) => {
        const value = values[indices[key]]!;
        if (['eventId','unitId','cohort','period','arm'].includes(key)) return [key, value];
        if (key === 'assigned' || key === 'exposed') { if (!['true','false','1','0'].includes(value)) throw new Error(`${key}: Use true/false or 1/0.`); return [key, value === 'true' || value === '1']; }
        const number = value.trim() ? Number(value) : NaN;
        if (!Number.isSafeInteger(number) || Math.abs(number) > 1000000000 || (key !== 'netMinor' && number < 0)) throw new Error(`${key}: Use bounded whole values; only netMinor may be negative.`);
        return [key, number];
      })) as unknown as ExtractRow;
      if (![result.eventId,result.unitId,result.cohort].every((value) => value.trim() && value.length < 200) || !['training','holdout','experiment'].includes(result.period) || !['baseline','candidate'].includes(result.arm)) throw new Error('Missing identity or unsupported period/arm.');
      if (result.endDay < result.startDay || result.receivedDay < result.endDay || result.eligibleDays < 1 || result.eligibleDays > result.endDay - result.startDay + 1 || result.activeDays > result.eligibleDays || result.purchaseDays > result.activeDays) throw new Error('Invalid dates, eligibility, attendance or purchases.');
      const encoded = JSON.stringify(result); const previous = seen.get(result.eventId);
      if (previous) { if (previous !== encoded) throw new Error('Conflicting duplicate event id.'); duplicates++; continue; }
      seen.set(result.eventId, encoded); rows.push(result);
    } catch (failure) { diagnostics.push(`Row ${i + 2}: ${(failure as Error).message}`); }
  }
  return { rows, diagnostics, duplicates, inputRows: parsed.length };
}
