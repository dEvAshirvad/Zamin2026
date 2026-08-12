import { describe, expect, it } from 'vitest';

import { splitCsvLine, validateStaffHeaders } from './staff-import.parse';

describe('staff-import.parse', () => {
  it('requires name, email, tehsil headers', () => {
    expect(validateStaffHeaders(['name', 'email', 'tehsil'])).toBeNull();
    expect(validateStaffHeaders(['Name', 'Email', 'Tehsil'])).toBeNull();
    expect(validateStaffHeaders(['name', 'email'])).toMatch(/tehsil/);
  });

  it('splits quoted CSV fields', () => {
    expect(splitCsvLine('Ram Kumar,ram@example.gov.in,Seoni')).toEqual([
      'Ram Kumar',
      'ram@example.gov.in',
      'Seoni',
    ]);
    expect(splitCsvLine('"Kumar, Ram",a@b.com,X')).toEqual([
      'Kumar, Ram',
      'a@b.com',
      'X',
    ]);
  });
});
