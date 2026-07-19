// src/app/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { AuthGuard } from '@/auth/AuthGuard';
import { LoginPage } from '@/auth/LoginPage';
import { SignupPage } from '@/auth/SignupPage';
import { AppLayout } from '@/shared/components/AppLayout';
import { InlineSpinner } from '@/shared/components/InlineSpinner';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';

const QuizPage = lazy(() => import('@/quiz/QuizPage').then((m) => ({ default: m.QuizPage })));
const MockExamPage = lazy(() => import('@/quiz/MockExamPage').then((m) => ({ default: m.MockExamPage })));
const AiGeneratePage = lazy(() =>
  import('@/quiz/ai/AiGeneratePage').then((m) => ({ default: m.AiGeneratePage })),
);
const AiFavoritesPage = lazy(() =>
  import('@/quiz/ai/AiFavoritesPage').then((m) => ({ default: m.AiFavoritesPage })),
);
const CertificationsPage = lazy(() =>
  import('@/certifications/CertificationsPage').then((m) => ({ default: m.CertificationsPage })),
);

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route path="/" element={<Navigate to="/certifications" replace />} />

            <Route
              path="/certifications"
              element={
                <AuthGuard>
                  <Suspense fallback={<InlineSpinner label="Loading certifications..." />}>
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
                    <Suspense fallback={<InlineSpinner label="Loading questions..." />}>
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
                    <Suspense fallback={<InlineSpinner label="Loading mock exam..." />}>
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
                    <Suspense fallback={<InlineSpinner label="Loading AI question generator..." />}>
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
                    <Suspense fallback={<InlineSpinner label="Loading favorite AI questions..." />}>
                      <AiFavoritesPage />
                    </Suspense>
                  </AppLayout>
                </AuthGuard>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
