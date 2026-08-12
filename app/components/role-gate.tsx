'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { BrandMark } from '@/components/brand-mark';
import { useLocale } from '@/hooks/use-locale';
import { useMe } from '@/hooks/use-me';
import { homeForRole, type PlatformRole } from '@/lib/auth-client';

export function RoleGate({
  allow,
  children,
}: {
  allow: PlatformRole[];
  children: ReactNode;
}) {
  const router = useRouter();
  const { data: me, isLoading, isFetched } = useMe();
  const { t } = useLocale();

  useEffect(() => {
    if (!isFetched || isLoading) return;
    if (!me?.role) {
      router.replace('/login');
      return;
    }
    if (!allow.includes(me.role)) {
      router.replace(homeForRole(me.role));
    }
  }, [allow, isFetched, isLoading, me, router]);

  if (isLoading || !me?.role || !allow.includes(me.role)) {
    return (
      <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
        <BrandMark className="size-7 animate-pulse text-ring" />
        <p className="text-sm text-muted-foreground">{t('checkingSession')}</p>
      </main>
    );
  }

  return <>{children}</>;
}
