import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell';

export default function DetailLayout({ children }: { children: ReactNode }) {
  return <AppShell tabs={false}>{children}</AppShell>;
}
