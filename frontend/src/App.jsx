import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ConfiguratorProvider } from './contexts/ConfiguratorContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UserMenu } from './components/auth/UserMenu';
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';

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
      <span className="ml-3 text-slate-300">Laden...</span>
    </div>
  );
}

function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1224] to-[#080a16] text-slate-100">
      <Header userMenu={<UserMenu />} />
      {children}
      <Footer />
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
                    <div className="max-w-4xl mx-auto px-6 py-12">
                      <h1 className="text-3xl font-bold mb-8">Mein Profil</h1>
                      <div className="bg-slate-800 rounded-lg p-6">
                        <p className="text-slate-300">
                          Profil-Seite kommt bald...
                        </p>
                      </div>
                    </div>
                  </CustomerLayout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/orders" 
              element={
                <ProtectedRoute>
                  <CustomerLayout>
                    <div className="max-w-6xl mx-auto px-6 py-12">
                      <h1 className="text-3xl font-bold mb-8">Meine Bestellungen</h1>
                      <div className="bg-slate-800 rounded-lg p-6">
                        <p className="text-slate-300">
                          Bestellungsübersicht kommt bald...
                        </p>
                      </div>
                    </div>
                  </CustomerLayout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/configurations" 
              element={
                <ProtectedRoute>
                  <CustomerLayout>
                    <div className="max-w-6xl mx-auto px-6 py-12">
                      <h1 className="text-3xl font-bold mb-8">Meine Konfigurationen</h1>
                      <div className="bg-slate-800 rounded-lg p-6">
                        <p className="text-slate-300">
                          Gespeicherte Konfigurationen kommen bald...
                        </p>
                      </div>
                    </div>
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
                    <div className="max-w-6xl mx-auto px-6 py-12">
                      <h1 className="text-3xl font-bold mb-8">Support Dashboard</h1>
                      <div className="bg-slate-800 rounded-lg p-6">
                        <p className="text-slate-300">
                          Support-Dashboard kommt bald...
                        </p>
                      </div>
                    </div>
                  </CustomerLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Legal Pages */}
            <Route 
              path="/privacy" 
              element={
                <CustomerLayout>
                  <div className="max-w-4xl mx-auto px-6 py-12">
                    <h1 className="text-3xl font-bold mb-8">Datenschutzerklärung</h1>
                    <div className="bg-slate-800 rounded-lg p-6 prose prose-invert max-w-none">
                      <p className="text-slate-300">
                        Datenschutzerklärung wird hier eingefügt...
                      </p>
                    </div>
                  </div>
                </CustomerLayout>
              } 
            />

            <Route 
              path="/terms" 
              element={
                <CustomerLayout>
                  <div className="max-w-4xl mx-auto px-6 py-12">
                    <h1 className="text-3xl font-bold mb-8">Allgemeine Geschäftsbedingungen</h1>
                    <div className="bg-slate-800 rounded-lg p-6 prose prose-invert max-w-none">
                      <p className="text-slate-300">
                        AGB werden hier eingefügt...
                      </p>
                    </div>
                  </div>
                </CustomerLayout>
              } 
            />
            
            {/* 404 Fallback */}
            <Route 
              path="*" 
              element={
                <CustomerLayout>
                  <div className="max-w-6xl mx-auto px-6 py-24 text-center">
                    <h1 className="text-2xl font-bold mb-4">Seite nicht gefunden</h1>
                    <p className="text-slate-300 mb-8">
                      Die angeforderte Seite existiert nicht.
                    </p>
                    <button
                      onClick={() => window.history.back()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200"
                    >
                      Zurück
                    </button>
                  </div>
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