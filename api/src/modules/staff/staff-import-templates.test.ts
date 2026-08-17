import { describe, expect, it } from 'vitest';

import { staffImportTemplates } from './staff.service';

describe('staffImportTemplates', () => {
  it('returns three role csv templates', async () => {
    const pack = await staffImportTemplates('csv');
    expect(pack.files.map((f) => f.filename)).toEqual([
      'tehsildar-import-template.csv',
      'ri-import-template.csv',
      'patwari-import-template.csv',
    ]);
    expect(pack.files[0]?.content).toContain('name,email,tehsil');
    expect(pack.files[0]?.content).toContain('tehsildar.example@district.gov');
  });

  it('returns three role xlsx templates as base64', async () => {
    const pack = await staffImportTemplates('xlsx');
    expect(pack.files).toHaveLength(3);
    expect(pack.files.every((f) => f.encoding === 'base64')).toBe(true);
    expect(pack.files[0]?.filename).toBe('tehsildar-import-template.xlsx');
    expect(Buffer.from(pack.files[0]!.content, 'base64').subarray(0, 2).toString()).toBe(
      'PK',
    );
  });
});
