'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { BrandMark } from '@/components/brand-mark';
import { useLocale } from '@/hooks/use-locale';
import { useMe } from '@/hooks/use-me';
import { homeForRole } from '@/lib/auth-client';

export default function Home() {
  const router = useRouter();
  const { data: me, isFetched } = useMe();
  const { t } = useLocale();

  useEffect(() => {
    if (!isFetched) return;
    router.replace(me?.role ? homeForRole(me.role) : '/login');
  }, [isFetched, me, router]);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
      <BrandMark className="size-7 animate-pulse text-ring" />
      <p className="text-sm text-muted-foreground">{t('loading')}</p>
    </main>
  );
}
