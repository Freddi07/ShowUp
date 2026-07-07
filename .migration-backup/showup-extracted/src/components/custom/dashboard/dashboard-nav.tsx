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
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const navItems = [
  {
    href: '/dashboard',
    label: 'Oversikt',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/integrations',
    label: 'Integrasjoner',
    icon: Plug,
  },
  {
    href: '/dashboard/kunder',
    label: 'Kunder',
    icon: Users,
  },
  {
    href: '/dashboard/statistikk',
    label: 'Statistikk',
    icon: BarChart2,
  },
  {
    href: '/dashboard/maler',
    label: 'Meldingsmaler',
    icon: MessageSquare,
  },
  {
    href: '/dashboard/svar',
    label: 'Svar',
    icon: Mail,
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
  const isAdmin =
    session?.user?.role
      ?.split(',')
      .map((r) => r.trim())
      .includes('admin') ?? false;

  return (
    <nav
      aria-label="Dashboard"
      className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
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
            'flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
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
