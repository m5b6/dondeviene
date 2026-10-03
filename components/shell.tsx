'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSavedStops } from '@/lib/hooks';
import { StopPlate } from './sign';

const TABS = [
  {
    href: '/',
    label: 'Cerca',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
        <circle cx="12" cy="12" r="6" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    ),
  },
  {
    href: '/guardados',
    label: 'Mis paraderos',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
        <path d="M6 3h12v18l-6-5-6 5z" />
      </svg>
    ),
  },
  {
    href: '/buscar',
    label: 'Buscar',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
        <circle cx="10" cy="10" r="6" />
        <path d="M15 15l6 6" />
      </svg>
    ),
  },
];

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

export const TabBar = () => {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t-2 border-ink bg-paper lg:hidden"
      style={{ height: 'calc(72px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`-mt-0.5 flex flex-1 flex-col items-center justify-center gap-1 text-xs leading-[14px] ${active ? 'border-t-4 border-ink font-extrabold' : 'font-bold text-mute'}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export const Rail = () => {
  const pathname = usePathname();
  const { saved } = useSavedStops();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[300px] flex-none flex-col gap-7 self-start overflow-y-auto bg-ink px-6 py-8 text-paper lg:flex">
      <Link href="/" className="text-[30px] font-extrabold leading-[30px] tracking-[-0.03em]">
        Dónde viene
      </Link>
      <nav aria-label="Principal" className="flex flex-col">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-14 items-center gap-3 px-3 text-[17px] ${active ? 'bg-paper font-extrabold text-ink' : 'font-bold'}`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col">
        <span className="pb-3 text-label uppercase">Mis paraderos</span>
        {saved.length === 0 ? (
          <span className="text-[15px] leading-5 text-rule">Guarda un paradero y aparece aquí.</span>
        ) : (
          saved.slice(0, 8).map((stop) => (
            <Link
              key={stop.code}
              href={`/paradero/${stop.code}`}
              className={`flex items-center gap-3 px-3 py-3 ${pathname === `/paradero/${stop.code}` ? 'bg-paper text-ink' : 'border-b border-body'}`}
            >
              <StopPlate code={stop.code} size="sm" invert={pathname !== `/paradero/${stop.code}`} />
              <span className="text-[15px] font-bold leading-[18px]">{stop.name}</span>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
};

export const AppShell = ({ children, tabs }: { children: ReactNode; tabs: boolean }) => (
  <div className="min-h-dvh lg:flex">
    <Rail />
    <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
      <div className={`flex flex-1 flex-col ${tabs ? 'pb-[calc(72px+env(safe-area-inset-bottom,0px))] lg:pb-0' : ''}`}>{children}</div>
    </div>
    {tabs ? <TabBar /> : null}
  </div>
);
