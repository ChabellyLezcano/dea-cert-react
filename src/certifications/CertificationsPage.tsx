import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/shared/components/Button';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { LanguageSettings } from '@/shared/components/LanguageSettings';
import { CERTIFICATIONS } from '@/certifications/registry';
import { useLocale } from '@/shared/i18n/useLocale';

export function CertificationsPage() {
  const { user, signOut } = useAuth();
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-ink-100 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <span className="text-xl font-extrabold tracking-tight text-ink-900">Cert Prep</span>

          <div className="flex min-w-0 items-center gap-3">
            <ThemeToggle />
            <span className="hidden max-w-[14rem] truncate text-sm text-ink-500 sm:inline">
              {user?.email}
            </span>
            <Button variant="ghost" onClick={() => signOut()}>
              {t('header.signOut')}
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <details className="group">
            <summary className="inline-block cursor-pointer text-xs font-semibold text-ink-400 hover:text-ink-600">
              {t('header.language')}
            </summary>
            <div className="mt-2 max-w-xs rounded-xl border border-ink-100 bg-surface shadow-sm">
              <LanguageSettings />
            </div>
          </details>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold text-ink-900">{t('certifications.title')}</h1>
        <p className="mb-6 text-sm text-ink-500">{t('certifications.subtitle')}</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CERTIFICATIONS.map((cert) => (
            <Link
              key={cert.id}
              to={`/certifications/${cert.id}/quiz`}
              className="group flex flex-col rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {cert.provider}
              </span>
              <span className="mt-1 text-lg font-bold text-ink-900">{cert.name}</span>
              {cert.examGuideVersion && (
                <span className="mt-2 text-xs text-ink-400">
                  {t('certifications.examGuide', { version: cert.examGuideVersion })}
                </span>
              )}
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-action">
                {t('certifications.startStudying')}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
