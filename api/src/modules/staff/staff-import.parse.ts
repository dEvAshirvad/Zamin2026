import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface StaffImportRow {
  name: string;
  email: string;
  tehsil: string;
  line: number;
}

const REQUIRED_HEADERS = ['name', 'email', 'tehsil'] as const;

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function validateStaffHeaders(headers: string[]): string | null {
  const normalized = headers.map(normalizeHeader);
  for (const required of REQUIRED_HEADERS) {
    if (!normalized.includes(required)) {
      return `Missing required column: ${required}`;
    }
  }
  return null;
}

function mapRow(
  headers: string[],
  cells: string[],
  line: number,
): StaffImportRow | { error: string; line: number } {
  const map = new Map<string, string>();
  headers.forEach((header, index) => {
    map.set(normalizeHeader(header), (cells[index] ?? '').trim());
  });

  const name = map.get('name') ?? '';
  const email = (map.get('email') ?? '').toLowerCase();
  const tehsil = map.get('tehsil') ?? '';

  if (!name || !email || !tehsil) {
    return { error: 'name, email, and tehsil are required', line };
  }
  if (!email.includes('@')) {
    return { error: 'invalid email', line };
  }

  return { name, email, tehsil, line };
}

function parseCsvText(text: string): StaffImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    throw new Error('File is empty');
  }

  const headers = splitCsvLine(lines[0]!);
  const headerError = validateStaffHeaders(headers);
  if (headerError) {
    throw new Error(headerError);
  }

  const rows: StaffImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const mapped = mapRow(headers, cells, i + 1);
    if ('error' in mapped) {
      throw new Error(`Line ${mapped.line}: ${mapped.error}`);
    }
    rows.push(mapped);
  }
  return rows;
}

/** Minimal CSV split supporting quoted fields. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      }
      else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map(c => c.trim());
}

async function parseXlsxFile(filePath: string): Promise<StaffImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Workbook has no sheets');
  }

  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values;
    // exceljs is 1-indexed
    const cells = Array.isArray(values)
      ? values.slice(1).map(v => (v == null ? '' : String(v).trim()))
      : [];
    if (cells.some(c => c.length > 0)) {
      matrix.push(cells);
    }
  });

  if (matrix.length === 0) {
    throw new Error('File is empty');
  }

  const headers = matrix[0]!;
  const headerError = validateStaffHeaders(headers);
  if (headerError) {
    throw new Error(headerError);
  }

  const rows: StaffImportRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const mapped = mapRow(headers, matrix[i]!, i + 1);
    if ('error' in mapped) {
      throw new Error(`Line ${mapped.line}: ${mapped.error}`);
    }
    rows.push(mapped);
  }
  return rows;
}

export async function parseStaffImportFile(filePath: string): Promise<StaffImportRow[]> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') {
    const text = await readFile(filePath, 'utf8');
    return parseCsvText(text);
  }
  if (ext === '.xlsx' || ext === '.xls') {
    return parseXlsxFile(filePath);
  }
  throw new Error('Unsupported file type (use .csv or .xlsx)');
}
