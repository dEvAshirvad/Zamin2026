'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { LocaleToggle } from '@/components/locale-toggle';
import { SiteFooter, SiteHeader, SiteNav } from '@/components/site';
import { Button } from '@/components/ui/button';
import { ErrorNote } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';
import { useLocale } from '@/hooks/use-locale';
import { useMe } from '@/hooks/use-me';
import { homeForRole, signInEmail, type PlatformRole } from '@/lib/auth-client';
import { queryKeys } from '@/lib/query-keys';

function formatLiveDate(d: Date) {
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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
  const liveDate = useMemo(() => formatLiveDate(new Date()), []);

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
      <SiteHeader
        rule="double"
        meta={
          <>
            <span>{liveDate}</span>
            <br />
            Raipur, Chhattisgarh 492001
            <br />
            <a
              href="https://raipur.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.68rem] text-ring underline underline-offset-2 hover:text-foreground"
            >
              raipur.gov.in →
            </a>
            <div className="mt-1.5 sm:flex sm:justify-end">
              <LocaleToggle />
            </div>
          </>
        }
        nav={
          <SiteNav
            items={[
              { href: '/', label: 'Home', active: true },
              { href: '/#modules', label: 'Modules' },
              { href: '/#officials', label: 'Officials' },
              { href: '/#contact', label: 'Contact' },
              { href: '/login', label: t('portalLogin'), portal: true },
            ]}
          />
        }
      />

      <main className="flex flex-1 flex-col px-6 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-105 border border-border bg-muted p-8 sm:p-10">
          <div className="mb-8 border-b border-border pb-6 text-center">
            <span className="text-micro text-muted-foreground">
              {t('secureAccess')}
            </span>
            <h1 className="mt-1.5 font-heading text-2xl tracking-[0.03em] text-foreground">
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

      <SiteFooter
        rule="single"
        columns={[
          {
            title: 'Quick Links',
            links: [
              { href: '/', label: 'Home' },
              { href: '/login', label: t('portalLogin') },
            ],
          },
          {
            title: 'External Portals',
            links: [
              {
                href: 'https://raipur.gov.in',
                label: 'District Raipur',
                external: true,
              },
              {
                href: 'https://cgstate.gov.in',
                label: 'Chhattisgarh State',
                external: true,
              },
            ],
          },
          {
            title: 'Contact',
            body: (
              <p className="mb-2">
                Collectorate, Naya Raipur
                <br />
                Chhattisgarh 492002
              </p>
            ),
            links: [
              { href: 'tel:07712426024', label: '0771-2426024' },
              {
                href: 'mailto:collector-rpr.cg@gov.in',
                label: 'collector-rpr.cg@gov.in',
              },
            ],
          },
        ]}
        bottom={
          <>
            © {year} {t('brand')}. {t('loginFooter')}
          </>
        }
      />
    </div>
  );
}
