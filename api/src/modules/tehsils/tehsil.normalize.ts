import { createHash } from 'node:crypto';

import { slugify } from '@/lib/slugify';

/** Trim, NFKC, collapse internal whitespace. */
export function normalizeTehsilName(raw: string): string {
  return raw.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

/** Casefold key for duplicate matching. */
export function tehsilMatchKey(raw: string): string {
  return normalizeTehsilName(raw).toLowerCase();
}

/** URL-safe slug; hex fallback when name is non-Latin only. */
export function tehsilSlugFromName(raw: string): string {
  const name = normalizeTehsilName(raw);
  const slug = slugify(name);
  if (slug) {
    return slug;
  }
  const hex = createHash('sha256').update(tehsilMatchKey(name)).digest('hex').slice(0, 24);
  return `t-${hex}`;
}
