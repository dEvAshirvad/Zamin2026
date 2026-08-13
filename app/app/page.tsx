'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { LandingHome } from '@/components/landing-home';
import { useMe } from '@/hooks/use-me';
import { homeForRole } from '@/lib/auth-client';

export default function Home() {
  const router = useRouter();
  const { data: me, isFetched } = useMe();

  useEffect(() => {
    if (!isFetched) return;
    if (me?.role) router.replace(homeForRole(me.role));
  }, [isFetched, me, router]);

  if (!isFetched) {
    return (
      <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (me?.role) {
    return (
      <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return <LandingHome />;
}
