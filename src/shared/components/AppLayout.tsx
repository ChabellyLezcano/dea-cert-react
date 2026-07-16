import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-ink-100 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-xl font-extrabold tracking-tight text-ink-900">DEA</span>
            <span className="hidden text-xs text-ink-400 sm:inline">
              Databricks Certified Data Engineer Associate
            </span>
          </div>

          <nav className="flex items-center gap-1 rounded-xl bg-ink-50 p-1" aria-label="Application sections">
            <TabLink to="/">Questions</TabLink>
            <TabLink to="/study">Study</TabLink>
          </nav>

          <div className="flex min-w-0 items-center gap-3">
            <ThemeToggle />
            <span className="hidden max-w-[14rem] truncate text-sm text-ink-500 sm:inline">
              {user?.email}
            </span>
            <Button variant="ghost" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function TabLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `rounded-lg px-4 py-2 text-sm font-semibold transition ${
          isActive ? 'bg-surface text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
