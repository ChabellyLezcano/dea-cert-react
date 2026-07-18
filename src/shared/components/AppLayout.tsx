import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

export function AppLayout({ children }: { children: ReactNode }) {
  const { certId } = useParams<{ certId: string }>();
  const base = `/certifications/${certId}`;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-ink-100 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/certifications"
              className="flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
              aria-label="Back to certifications"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Certifications</span>
            </Link>
            <span className="h-5 w-px bg-ink-200" />
            <Link to="/certifications" className="text-xl font-extrabold tracking-tight text-ink-900">
              DEA
            </Link>
          </div>

          <nav className="flex items-center gap-1 rounded-xl bg-ink-50 p-1" aria-label="Application sections">
            <TabLink to={`${base}/quiz`}>Practice</TabLink>
            <TabLink to={`${base}/guide`}>Study Guide</TabLink>
            <TabLink to={`${base}/study`}>Glossary</TabLink>
          </nav>

          <HeaderMenu />
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

/** Collapses account-related controls (email, theme, sign out) behind a
 * single hamburger button, keeping the header from feeling crowded --
 * these are secondary actions, not primary navigation. */
function HeaderMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-60 rounded-xl border border-ink-100 bg-surface p-2 shadow-lg"
        >
          <div className="border-b border-ink-100 px-3 pb-2">
            <span className="block truncate text-sm font-medium text-ink-800">{user?.email}</span>
          </div>

          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-sm text-ink-500">Theme</span>
            <ThemeToggle />
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-ko-600 transition hover:bg-ko-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
