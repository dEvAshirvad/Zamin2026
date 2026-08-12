import { describe, expect, it } from 'vitest';

import {
  normalizeTehsilName,
  tehsilMatchKey,
  tehsilSlugFromName,
} from './tehsil.normalize';

describe('tehsil.normalize', () => {
  it('collapses whitespace and casefolds match key', () => {
    expect(normalizeTehsilName('  Seoni   Malwa ')).toBe('Seoni Malwa');
    expect(tehsilMatchKey('  Seoni   Malwa ')).toBe('seoni malwa');
    expect(tehsilMatchKey('SEONI MALWA')).toBe('seoni malwa');
  });

  it('slugifies latin names', () => {
    expect(tehsilSlugFromName('Seoni Malwa')).toBe('seoni-malwa');
  });

  it('uses hex fallback for non-latin names', () => {
    const slug = tehsilSlugFromName('सिवनी');
    expect(slug.startsWith('t-')).toBe(true);
    expect(slug.length).toBeGreaterThan(4);
  });
});
