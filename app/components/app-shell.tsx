'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import {
  ClipboardTextIcon,
  ClockCounterClockwiseIcon,
  ChartBarIcon,
  ListIcon,
  SignOutIcon,
  UsersThreeIcon,
  XIcon,
} from '@phosphor-icons/react';

import { LocaleToggle } from '@/components/locale-toggle';
import { SiteBrand } from '@/components/site';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import type { MeUser, PlatformRole } from '@/lib/auth-client';
import { signOut } from '@/lib/auth-client';
import type { MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelKey: MessageKey;
  icon: typeof ListIcon;
  roles: PlatformRole[];
  /** Match nested routes (e.g. /admin/cases/[id]) but not sibling sections. */
  prefix?: boolean;
}

const NAV: NavItem[] = [
  {
    href: '/tehsildar',
    labelKey: 'navCases',
    icon: ListIcon,
    roles: ['tehsildar'],
    prefix: true,
  },
  {
    href: '/ri',
    labelKey: 'navCases',
    icon: ListIcon,
    roles: ['ri'],
    prefix: true,
  },
  {
    href: '/patwari',
    labelKey: 'navCases',
    icon: ListIcon,
    roles: ['patwari'],
    prefix: true,
  },
  {
    href: '/admin',
    labelKey: 'navStaff',
    icon: UsersThreeIcon,
    roles: ['admin'],
  },
  {
    href: '/admin/cases',
    labelKey: 'navCases',
    icon: ClipboardTextIcon,
    roles: ['admin'],
    prefix: true,
  },
  {
    href: '/admin/metrics',
    labelKey: 'navMetrics',
    icon: ChartBarIcon,
    roles: ['admin'],
  },
  {
    href: '/admin/audit',
    labelKey: 'navAudit',
    icon: ClockCounterClockwiseIcon,
    roles: ['admin'],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.prefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

function NavLinks({
  me,
  onNavigate,
  className,
}: {
  me: MeUser;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const items = NAV.filter((i) => me.role && i.roles.includes(me.role));

  return (
    <nav className={cn('flex flex-col gap-0.5', className)}>
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-none border border-transparent px-2.5 py-2 text-sm uppercase tracking-wider transition-colors',
              active
                ? 'border-sidebar-accent bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon size={17} weight={active ? 'fill' : 'regular'} />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock({ me }: { me: MeUser }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLocale();

  async function onSignOut() {
    await signOut();
    queryClient.clear();
    router.replace('/login');
  }

  const roleKey = (me.role ?? 'ri') as MessageKey;

  return (
    <div className="flex flex-col gap-2.5 border-t  border-sidebar-border px-3 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-sm text-foreground">
          {me.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {t(roleKey)}
          {me.tehsil ? ` · ${me.tehsil.name}` : ''}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <LocaleToggle />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onPress={onSignOut}
          aria-label={t('signOut')}
        >
          <SignOutIcon size={14} />
          {t('signOut')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Persistent role-aware shell. Replaces the per-page `ShellHeader` plus each
 * page's hand-rolled row of underlined links. See design.md §6.
 */
export function AppShell({
  me,
  title,
  description,
  actions,
  children,
  width = 'wide',
}: {
  me: MeUser;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** `wide` for lists and tables, `narrow` for detail and forms. */
  width?: 'wide' | 'narrow';
}) {
  const { t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1">
      {/* Sidebar — lg and up */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex flex-col gap-5">
          <div className="border-b border-sidebar-border p-3 py-4">
            <SiteBrand compact />
          </div>
          <NavLinks me={me} className="px-3" />
        </div>
        <UserBlock me={me} />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-sidebar p-3 lg:hidden">
        <SiteBrand compact />
        <div className="flex items-center gap-2">
          <LocaleToggle />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t('openMenu')}
            onPress={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <XIcon size={15} /> : <ListIcon size={15} />}
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-x-0 top-13 z-40 border-b border-border bg-sidebar p-3 lg:hidden">
          <NavLinks me={me} onNavigate={() => setMobileOpen(false)} />
          <UserBlock me={me} />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col pt-13 lg:pt-0">
        <main
          className={cn(
            'mx-auto flex w-full flex-1 flex-col gap-6',
            width === 'narrow' ? 'max-w-3xl' : 'max-w-none',
          )}
        >
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-6">
            <div className="min-w-0 space-y-1">
              <h1 className="font-heading text-[28px] leading-9 tracking-[0.03em]">
                {title}
              </h1>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            ) : null}
          </header>
          <div className="space-y-6 p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
