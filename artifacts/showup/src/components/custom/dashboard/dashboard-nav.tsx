// @polsia:user-owned
'use client';

import {
  BarChart2,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Plug,
  Settings,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { Link } from 'wouter';
import { usePathname } from '@/lib/compat/next-navigation';
import { isAdminEmail } from '@/lib/admin-config';
import { useSession } from '@/lib/auth-client';
import { useOnboardingStatus } from '@/hooks/use-onboarding';
import { isSectionEnabled, type SectionKey } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

const navItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  sectionKey?: SectionKey;
}[] = [
  {
    href: '/dashboard',
    label: 'Oversikt',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/integrations',
    label: 'Integrasjoner',
    icon: Plug,
    sectionKey: 'integrations',
  },
  {
    href: '/dashboard/kunder',
    label: 'Kunder',
    icon: Users,
    sectionKey: 'kunder',
  },
  {
    href: '/dashboard/statistikk',
    label: 'Statistikk',
    icon: BarChart2,
    sectionKey: 'statistikk',
  },
  {
    href: '/dashboard/maler',
    label: 'Meldingsmaler',
    icon: MessageSquare,
    sectionKey: 'maler',
  },
  {
    href: '/dashboard/svar',
    label: 'Svar',
    icon: Mail,
    sectionKey: 'svar',
  },
  {
    href: '/dashboard/innstillinger/varsler',
    label: 'Varsler',
    icon: Settings,
  },
  {
    href: '/dashboard/konto',
    label: 'Konto',
    icon: User,
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: onboarding } = useOnboardingStatus();
  const isAdmin = isAdminEmail(session?.user?.email);
  const visibleItems = navItems.filter(
    (item) =>
      !item.sectionKey ||
      isSectionEnabled(item.sectionKey, onboarding?.enabledSections),
  );

  return (
    <nav
      aria-label="Dashboard"
      className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0"
    >
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-11 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors lg:h-10 lg:px-3',
              active
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      {isAdmin && (
        <Link
          href="/admin"
          aria-current={pathname === '/admin' ? 'page' : undefined}
          className={cn(
            'flex h-11 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors lg:h-10 lg:px-3',
            pathname === '/admin'
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
          )}
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          <span>Admin</span>
        </Link>
      )}
    </nav>
  );
}
