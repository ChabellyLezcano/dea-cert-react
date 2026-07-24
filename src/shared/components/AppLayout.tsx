import { useRef, type ReactNode } from 'react';
import { Header } from '@/shared/components/Header';
import { useElementHeight } from '@/shared/hooks/useElementHeight';

export function AppLayout({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  const headerHeight = useElementHeight(headerRef);

  return (
    <div className="min-h-screen bg-canvas">
      <Header ref={headerRef} />

      <main className="mx-auto max-w-6xl px-4 py-8" style={{ paddingTop: headerHeight + 32 }}>
        {children}
      </main>
    </div>
  );
}
