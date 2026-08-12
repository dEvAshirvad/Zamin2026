'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { BrandMark } from '@/components/brand-mark';
import { LocaleToggle } from '@/components/locale-toggle';
import { Button } from '@/components/ui/button';
import { ErrorNote } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';
import { useLocale } from '@/hooks/use-locale';
import { useMe } from '@/hooks/use-me';
import { homeForRole, signInEmail, type PlatformRole } from '@/lib/auth-client';
import { queryKeys } from '@/lib/query-keys';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isFetched } = useMe();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (isFetched && me?.role) {
      router.replace(homeForRole(me.role));
    }
  }, [isFetched, me, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signInEmail(email.trim(), password);
      await queryClient.invalidateQueries({ queryKey: queryKeys.session });
      const meRes = await queryClient.fetchQuery({
        queryKey: queryKeys.session,
        queryFn: async () => {
          const { fetchMe } = await import('@/lib/auth-client');
          return fetchMe();
        },
      });
      router.replace(homeForRole(meRes?.role as PlatformRole | null));
    } catch (err) {
      setError(
        err && typeof err === 'object' && 'friendlyMessage' in err
          ? String((err as { friendlyMessage?: string }).friendlyMessage)
          : t('signInFailed')
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      {/* Masthead — matches rid.rdmp.in/pages/login.html */}
      <header className="border-b border-border bg-muted py-6">
        <div className="mx-auto w-full max-w-[780px] px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <BrandMark className="size-16 shrink-0 text-ring" />
              <div className="flex min-w-0 flex-col">
                <span className="text-micro text-muted-foreground">
                  {t('brandStamp')}
                </span>
                <span className="mt-0.5 text-[1.75rem] font-semibold leading-tight tracking-[0.03em] text-foreground">
                  {t('brand')}
                </span>
                <p className="mt-1 text-xs tracking-[0.08em] text-muted-foreground">
                  {t('brandTagline')}
                </p>
              </div>
            </div>
            <LocaleToggle className="shrink-0" />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-6 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-[420px] border border-border bg-muted p-8 sm:p-10">
          <div className="mb-8 border-b border-border pb-6 text-center">
            <span className="text-micro text-muted-foreground">
              {t('secureAccess')}
            </span>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[0.03em] text-foreground">
              {t('loginTitle')}
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('loginSubtitle')}
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <Field label={t('email')}>
              <Input
                type="email"
                required
                autoComplete="username"
                placeholder="e.g. tehsildar@district.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t('password')}>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isDisabled={pending}
            >
              {pending ? t('signingIn') : t('signIn')}
            </Button>
          </form>

          <hr className="my-6 border-0 border-t border-border" />
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            {t('loginHelp')}
          </p>
        </div>
      </main>

      <footer className="border-t  border-border bg-muted py-6">
        <div className="mx-auto w-full max-w-[780px] px-6">
          <p className="text-center text-[0.68rem] tracking-[0.06em] text-muted-foreground">
            © {year} {t('loginFooter')}
          </p>
        </div>
      </footer>
    </div>
  );
}
