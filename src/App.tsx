// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AppShell } from './pages/AppShell';
import { LandingPage } from './pages/LandingPage';
import { PricingPage } from './pages/PricingPage';
import { FuturesBasicsPage } from './pages/FuturesBasicsPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { AuthConfirmPage } from './pages/AuthConfirmPage';
import { TermsPage } from './pages/TermsPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SupportWidget } from './components/SupportWidget';
import { UpdateToast } from './components/UpdateToast';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="grain">
          <Routes>
            <Route path="/"                element={<LandingPage />} />
            <Route path="/pricing"         element={<PricingPage />} />
            <Route path="/signup"          element={<SignupPage />} />
            <Route path="/futures-basics"  element={<FuturesBasicsPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/auth/confirm"    element={<AuthConfirmPage />} />
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/terms"           element={<TermsPage />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {/* Support widget — visible on ALL pages, logged in or out */}
          <SupportWidget />
          {/* Update toast — notifies users when a new version is deployed */}
          <UpdateToast />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
