import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { AuthGuard } from '../auth/AuthGuard';
import { LoginPage } from '../auth/LoginPage';
import { SignupPage } from '../auth/SignupPage';
import { AppLayout } from '../shared/components/AppLayout';
import { InlineSpinner } from '../shared/components/InlineSpinner';
import { ThemeProvider } from '../shared/theme/ThemeProvider';

const QuizPage = lazy(() => import('../quiz/QuizPage').then((m) => ({ default: m.QuizPage })));
const StudyPage = lazy(() => import('../study/StudyPage').then((m) => ({ default: m.StudyPage })));

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/"
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
              path="/study"
              element={
                <AuthGuard>
                  <AppLayout>
                    <Suspense fallback={<InlineSpinner label="Loading study section..." />}>
                      <StudyPage />
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
