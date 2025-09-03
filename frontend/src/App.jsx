import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ConfiguratorProvider } from './contexts/ConfiguratorContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UserMenu } from './components/auth/UserMenu';
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';
import PrivacyBanner from './components/legal/PrivacyBanner';

// Import page components
import ProfilePage from './components/pages/ProfilePage';
import OrdersPage from './components/pages/OrdersPage';
import ConfigurationsPage from './components/pages/ConfigurationsPage';
import SupportPage from './components/pages/SupportPage';
import PrivacyPage from './components/pages/PrivacyPage';
import TermsPage from './components/pages/TermsPage';
import NotFoundPage from './components/pages/NotFoundPage';
import SEOHead from './components/common/SEOHead';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

// Lazy Loading für bessere Performance
const ConfiguratorPage = lazy(() => import('./pages/customer/ConfiguratorPage'));
const AdvisorPage = lazy(() => import('./pages/customer/AdvisorPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage').then(module => ({ default: module.VerifyEmailPage })));

// Loading Spinner Komponente
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-slate-300">Loading...</span>
    </div>
  );
}

function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1224] to-[#080a16] text-slate-100">
      <SEOHead />
      <Header userMenu={<UserMenu />} />
      {children}
      <Footer />
      <PrivacyBanner />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ConfiguratorProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={
              <Suspense fallback={<LoadingSpinner />}>
                <LoginPage />
              </Suspense>
            } />
            <Route path="/register" element={<Navigate to="/login?mode=register" replace />} />
            <Route path="/forgot-password" element={<Navigate to="/login?mode=forgot" replace />} />
            <Route path="/reset-password" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ResetPasswordPage />
              </Suspense>
            } />
            <Route path="/verify-email" element={
              <Suspense fallback={<LoadingSpinner />}>
                <VerifyEmailPage />
              </Suspense>
            } />

            {/* Public Customer Routes */}
            <Route 
              path="/" 
              element={
                <CustomerLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <ConfiguratorPage />
                  </Suspense>
                </CustomerLayout>
              } 
            />

            {/* Checkout Routes */}
            <Route 
              path="/checkout/:orderId" 
              element={
                <CustomerLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <CheckoutPage />
                  </Suspense>
                </CustomerLayout>
              }
            />
            <Route 
              path="/order/:orderId/success" 
              element={
                <CustomerLayout>
                  <PaymentSuccessPage />
                </CustomerLayout>
              }
            />
            
            {/* Protected Customer Routes */}
            <Route 
              path="/advisor" 
              element={
                <ProtectedRoute>
                  <CustomerLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <AdvisorPage />
                    </Suspense>
                  </CustomerLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/configurator" 
              element={
                <CustomerLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <ConfiguratorPage />
                  </Suspense>
                </CustomerLayout>
              } 
            />

            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <CustomerLayout>
                    <ProfilePage />
                  </CustomerLayout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/orders" 
              element={
                <ProtectedRoute>
                  <CustomerLayout>
                    <OrdersPage />
                  </CustomerLayout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/configurations" 
              element={
                <ProtectedRoute>
                  <CustomerLayout>
                    <ConfigurationsPage />
                  </CustomerLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes - Require Admin Role and Email Verification */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requireRole="admin" requireVerified={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminPage />
                  </Suspense>
                </ProtectedRoute>
              } 
            />

            {/* Support Routes - Require Support/Admin Role */}
            <Route 
              path="/support" 
              element={
                <ProtectedRoute requireRole={['admin', 'support']} requireVerified={true}>
                  <CustomerLayout>
                    <SupportPage />
                  </CustomerLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Legal Pages */}
            <Route 
              path="/privacy" 
              element={
                <CustomerLayout>
                  <PrivacyPage />
                </CustomerLayout>
              } 
            />

            <Route 
              path="/terms" 
              element={
                <CustomerLayout>
                  <TermsPage />
                </CustomerLayout>
              } 
            />
            
            {/* 404 Fallback */}
            <Route 
              path="*" 
              element={
                <CustomerLayout>
                  <NotFoundPage />
                </CustomerLayout>
              } 
            />
          </Routes>
        </ConfiguratorProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
