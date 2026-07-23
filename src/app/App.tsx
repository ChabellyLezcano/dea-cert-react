// src/app/App.tsx
import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { AuthGuard } from '@/auth/AuthGuard';
import { LoginPage } from '@/auth/LoginPage';
import { SignupPage } from '@/auth/SignupPage';
import { AppLayout } from '@/shared/components/AppLayout';
import { InlineSpinner } from '@/shared/components/InlineSpinner';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { LocaleProvider } from '@/shared/i18n/LocaleContext';
import { useLocale } from '@/shared/i18n/useLocale';
import { lazyWithReload } from '@/shared/utils/lazyWithReload';

const QuizPage = lazyWithReload(
  () => import('@/quiz/QuizPage').then((m) => ({ default: m.QuizPage })),
  'quiz-page',
);
const MockExamPage = lazyWithReload(
  () => import('@/quiz/MockExamPage').then((m) => ({ default: m.MockExamPage })),
  'mock-exam-page',
);
const AiGeneratePage = lazyWithReload(
  () => import('@/quiz/ai/AiGeneratePage').then((m) => ({ default: m.AiGeneratePage })),
  'ai-generate-page',
);
const AiFavoritesPage = lazyWithReload(
  () => import('@/quiz/ai/AiFavoritesPage').then((m) => ({ default: m.AiFavoritesPage })),
  'ai-favorites-page',
);
const CertificationsPage = lazyWithReload(
  () => import('@/certifications/CertificationsPage').then((m) => ({ default: m.CertificationsPage })),
  'certifications-page',
);

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </LocaleProvider>
    </ThemeProvider>
  );
}

// Suspense fallback labels need `t()`, which only works below
// LocaleProvider -- pulled into its own component so App() itself doesn't
// need to (App just wires up the provider tree).
function AppRoutes() {
  const { t } = useLocale();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route path="/" element={<Navigate to="/certifications" replace />} />

      <Route
        path="/certifications"
        element={
          <AuthGuard>
            <Suspense fallback={<InlineSpinner label={t('loading.certifications')} />}>
              <CertificationsPage />
            </Suspense>
          </AuthGuard>
        }
      />

      <Route
        path="/certifications/:certId/quiz"
        element={
          <AuthGuard>
            <AppLayout>
              <Suspense fallback={<InlineSpinner label={t('loading.suspenseQuestions')} />}>
                <QuizPage />
              </Suspense>
            </AppLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/certifications/:certId/mock-exam"
        element={
          <AuthGuard>
            <AppLayout>
              <Suspense fallback={<InlineSpinner label={t('loading.mockExam')} />}>
                <MockExamPage />
              </Suspense>
            </AppLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/certifications/:certId/ai-generate"
        element={
          <AuthGuard>
            <AppLayout>
              <Suspense fallback={<InlineSpinner label={t('loading.aiGenerator')} />}>
                <AiGeneratePage />
              </Suspense>
            </AppLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/certifications/:certId/ai-favorites"
        element={
          <AuthGuard>
            <AppLayout>
              <Suspense fallback={<InlineSpinner label={t('loading.aiFavorites')} />}>
                <AiFavoritesPage />
              </Suspense>
            </AppLayout>
          </AuthGuard>
        }
      />
    </Routes>
  );
}
