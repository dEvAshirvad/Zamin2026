/** Platform identity on Simankan — exactly one per user. */
export type PlatformRole = 'admin' | 'tehsildar' | 'ri' | 'patwari';

export const PLATFORM_ROLES = ['admin', 'tehsildar', 'ri', 'patwari'] as const;
