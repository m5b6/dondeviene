import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell';

export default function TabsLayout({ children }: { children: ReactNode }) {
  return <AppShell tabs>{children}</AppShell>;
}
