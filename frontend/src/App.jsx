import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfiguratorProvider } from './contexts/ConfiguratorContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UserMenu } from './components/auth/UserMenu';
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';
import ConfiguratorPage from './pages/customer/ConfiguratorPage';
import AdvisorPage from './pages/customer/AdvisorPage';
import AdminPage from './pages/admin/AdminPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';

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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login?mode=register" replace />} />
            <Route path="/forgot-password" element={<Navigate to="/login?mode=forgot" replace />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Public Customer Routes */}
            <Route 
              path="/" 
              element={
                <CustomerLayout>
                  <ConfiguratorPage />
                </CustomerLayout>
              } 
            />
            
            {/* Protected Customer Routes */}
            <Route 
              path="/advisor" 
              element={
                <ProtectedRoute>
                  <CustomerLayout>
                    <AdvisorPage />
                  </CustomerLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/configurator" 
              element={
                <CustomerLayout>
                  <ConfiguratorPage />
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
                  <AdminPage />
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