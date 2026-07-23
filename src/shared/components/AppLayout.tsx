import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { BookOpen, FileText, Sparkles, Star, RotateCcw } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { LanguageSettings } from '@/shared/components/LanguageSettings';
import { getCertification } from '@/certifications/registry';
import { useLocale } from '@/shared/i18n/useLocale';

export function AppLayout({ children }: { children: ReactNode }) {
  const { certId } = useParams<{ certId: string }>();
  const { t } = useLocale();
  const base = `/certifications/${certId}`;
  const acronym = getCertification(certId)?.acronym ?? '···';

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-ink-100 bg-surface/90 backdrop-blur">
        {/* Single line header container holding all elements with horizontal scrolling for mobile */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 overflow-x-auto scrollbar-thin [-webkit-overflow-scrolling:touch]">
          {/* Left: Back navigation and certification acronym */}
          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/certifications"
              className="flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
              aria-label={t('nav.backToCertifications')}
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">{t('nav.backToCertifications')}</span>
            </Link>
            <span className="h-5 w-px bg-ink-200" />
            <Link to="/certifications" className="text-xl font-extrabold tracking-tight text-ink-900">
              {acronym}
            </Link>
          </div>

          {/* Center/Inline: Tab navigation with primary highlights, icons, and hidden text on small screens */}
          <nav
            className="flex shrink-0 items-center gap-2 rounded-xl bg-ink-50 p-1"
            aria-label="Application sections"
          >
            <TabLink
              to={`${base}/quiz`}
              icon={<BookOpen className="h-4 w-4 shrink-0" />}
              label={t('nav.practice')}
            />
            <TabLink
              to={`${base}/mock-exam`}
              icon={<FileText className="h-4 w-4 shrink-0" />}
              label={t('nav.mockExam')}
            />
            <TabLink
              to={`${base}/ai-generate`}
              icon={<Sparkles className="h-4 w-4 shrink-0" />}
              label={t('nav.aiGenerate')}
            />
            <TabLink
              to={`${base}/ai-favorites`}
              icon={<Star className="h-4 w-4 shrink-0" />}
              label={t('nav.aiFavorites')}
            />
          </nav>

          {/* Right: Hamburger menu for secondary actions */}
          <div className="shrink-0">
            <HeaderMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function TabLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end
      title={label}
      className={({ isActive }) =>
        `flex items-center gap-2 shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
          isActive
            ? 'bg-brand-500 text-white shadow-sm'
            : 'text-ink-600 hover:bg-ink-100/60 hover:text-ink-900'
        }`
      }
    >
      {icon}
      {/* Hidden text on mobile screens (sm and down), visible from md screens upwards */}
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  );
}

/** Collapses account-related controls (email, theme, language, sign out)
 * behind a single hamburger button, keeping the header from feeling
 * crowded -- these are secondary actions, not primary navigation. */
function HeaderMenu() {
  const { user, signOut } = useAuth();
  const { t } = useLocale();
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
        aria-label={t('header.openMenu')}
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
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-ink-100 bg-surface p-2 shadow-lg"
        >
          <div className="border-b border-ink-100 px-3 pb-2">
            <span className="block truncate text-sm font-medium text-ink-800">{user?.email}</span>
          </div>

          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-sm text-ink-500">{t('header.theme')}</span>
            <ThemeToggle />
          </div>

          <div className="border-t border-ink-100">
            <LanguageSettings />
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full rounded-lg border-t border-ink-100 px-3 py-2.5 text-left text-sm font-semibold text-ko-600 transition hover:bg-ko-100 flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t('header.signOut')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
