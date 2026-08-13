'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { LocaleToggle } from '@/components/locale-toggle';
import {
  SiteContainer,
  SiteFooter,
  SiteHeader,
  SiteNav,
  SiteRule,
  SiteSectionHeader,
} from '@/components/site';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

const MODULES = [
  {
    code: 'ADMIN',
    name: 'District Admin',
    category: 'Oversight',
    href: '/login',
  },
  {
    code: 'TEHSIL',
    name: 'Tehsildar Desk',
    category: 'Case intake',
    href: '/login',
  },
  {
    code: 'RI',
    name: 'Revenue Inspector',
    category: 'Field work',
    href: '/login',
  },
  {
    code: 'SLA',
    name: 'Lok Seva Guarantee',
    category: '30-day clock',
    href: '#guarantee',
  },
  {
    code: 'METRICS',
    name: 'District Metrics',
    category: 'Monitoring',
    href: '/login',
  },
  {
    code: 'AUDIT',
    name: 'Audit Trail',
    category: 'Accountability',
    href: '/login',
  },
];

const OFFICIALS = [
  {
    name: 'Dr. Gaurav Kumar Singh',
    service: 'IAS',
    designation: 'Collector & District Magistrate, Raipur',
    division: 'Collectorate',
    phone: '0771-2426024',
    tel: '07712426024',
  },
  {
    name: 'Shri Sanjeev Shukla',
    service: 'IPS',
    designation: 'Commissioner of Police, Raipur',
    division: 'Police Department',
    phone: '0771-2285004',
    tel: '07712285004',
  },
  {
    name: 'Kumar Biswaranjan',
    service: 'IAS',
    designation: 'Chief Executive Officer, District Panchayat',
    division: 'Zilla Panchayat',
    phone: '0771-2426739',
    tel: '07712426739',
  },
  {
    name: 'Sambit Mishra',
    service: 'IAS',
    designation: 'Commissioner, Municipal Corporation Raipur',
    division: 'Nagar Nigam',
    phone: '0771-2531014',
    tel: '07712531014',
  },
];

function formatLiveDate(d: Date) {
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function LandingHome() {
  const { t } = useLocale();
  const liveDate = useMemo(() => formatLiveDate(new Date()), []);
  const year = new Date().getFullYear();
  const brand = t('brand');

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
              { href: '#top', label: 'Home', active: true },
              { href: '#modules', label: 'Modules' },
              { href: '#officials', label: 'Officials' },
              { href: '#contact', label: 'Contact' },
              { href: '/login', label: t('portalLogin'), portal: true },
            ]}
          />
        }
      />

      <main id="top" className="flex-1 py-10 pb-16">
        <SiteContainer>
          <div
            id="guarantee"
            className="mb-12 border border-border bg-muted px-8 py-8 text-center"
          >
            <p className="mb-4 text-[0.7rem] tracking-[0.5em] text-border">
              ★ ★ ★
            </p>
            <h1 className="mb-2 font-heading text-[2.2rem] leading-tight text-foreground">
              {brand}
            </h1>
            <p className="mb-5 text-sm tracking-widest text-muted-foreground uppercase">
              {t('brandStamp')}
            </p>
            <p className="m-0 border-t border-border pt-3 text-[0.68rem] tracking-wider text-muted-foreground">
              Collector &amp; DM: Dr. Gaurav Kumar Singh, IAS &nbsp;•&nbsp; CP:
              Shri Sanjeev Shukla, IPS &nbsp;•&nbsp; Nagar Nigam Commissioner:
              Sambit Mishra, IAS &nbsp;•&nbsp; CEO ZP: Kumar Biswaranjan, IAS
            </p>
          </div>

          <SiteRule variant="double" />

          <section className="mb-12" id="modules">
            <SiteSectionHeader
              title="Key Modules"
              action={<Link href="/login">Sign in →</Link>}
            />
            <SiteRule variant="single" className="my-2" />
            <div className="my-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
              {MODULES.map((m) => (
                <div
                  key={m.code}
                  className="flex flex-col gap-2 bg-background p-5 hover:bg-muted"
                >
                  <span className="text-[0.65rem] tracking-[0.2em] text-ring uppercase">
                    {m.code}
                  </span>
                  <span className="font-heading text-[0.95rem] leading-snug">
                    {m.name}
                  </span>
                  <span className="text-[0.65rem] tracking-wider text-muted-foreground uppercase">
                    {m.category}
                  </span>
                  {m.href.startsWith('/') ? (
                    <Link
                      href={m.href}
                      className="mt-auto pt-2 text-[0.7rem] tracking-wide text-sla-duesoon no-underline hover:text-foreground hover:underline"
                    >
                      Open →
                    </Link>
                  ) : (
                    <a
                      href={m.href}
                      className="mt-auto pt-2 text-[0.7rem] tracking-wide text-sla-duesoon no-underline hover:text-foreground hover:underline"
                    >
                      Learn more →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          <SiteRule variant="double" />

          <section className="mb-4" id="officials">
            <SiteSectionHeader
              title="Senior Officials"
              action={<a href="#contact">Contact →</a>}
            />
            <SiteRule variant="single" className="my-2" />
            <div className="overflow-x-auto">
              <table className="my-6 w-full min-w-130 border-collapse text-[0.82rem]">
                <thead>
                  <tr>
                    {['Name', 'Designation', 'Division', 'Phone'].map((h) => (
                      <th
                        key={h}
                        className="border-b-2 border-foreground px-3 py-2 text-left font-mono text-[0.65rem] font-normal tracking-[0.15em] text-muted-foreground uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OFFICIALS.map((o) => (
                    <tr key={o.name} className="hover:bg-muted">
                      <td className="border-b border-border px-3 py-3 align-top">
                        <span className="font-heading">{o.name}</span>
                        <span className="ml-1 inline-block border border-ring px-1 align-middle text-[0.62rem] tracking-widest text-ring">
                          {o.service}
                        </span>
                      </td>
                      <td className="border-b border-border px-3 py-3 align-top">
                        {o.designation}
                      </td>
                      <td className="border-b border-border px-3 py-3 align-top">
                        {o.division}
                      </td>
                      <td className="border-b border-border px-3 py-3 align-top">
                        <a
                          href={`tel:${o.tel}`}
                          className="text-ring underline underline-offset-2 hover:text-foreground"
                        >
                          {o.phone}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </SiteContainer>
      </main>

      <SiteFooter
        id="contact"
        rule="double"
        columns={[
          {
            title: 'Quick Links',
            links: [
              { href: '#top', label: 'Home' },
              { href: '#notices', label: 'Notices' },
              { href: '#modules', label: 'Modules' },
              { href: '#officials', label: "Who's Who" },
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
              {
                href: 'https://revenue.cg.nic.in',
                label: 'Revenue Dept.',
                external: true,
              },
              {
                href: 'https://pwd.cg.nic.in',
                label: 'Public Works Dept.',
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
            © {year} District Administration Raipur · {brand}.{' '}
            {t('loginFooter')}
          </>
        }
      />
    </div>
  );
}
