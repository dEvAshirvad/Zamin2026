/** Platform identity on Simankan — exactly one per user. */
export type PlatformRole = 'admin' | 'tehsildar' | 'ri';

export const PLATFORM_ROLES = ['admin', 'tehsildar', 'ri'] as const;
