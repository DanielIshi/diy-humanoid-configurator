import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfiguratorProvider } from './contexts/ConfiguratorContext';
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';
import ConfiguratorPage from './pages/customer/ConfiguratorPage';
import AdvisorPage from './pages/customer/AdvisorPage';
import AdminPage from './pages/admin/AdminPage';

function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1224] to-[#080a16] text-slate-100">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <ConfiguratorProvider>
        <Routes>
          {/* Customer Routes */}
          <Route 
            path="/" 
            element={
              <CustomerLayout>
                <ConfiguratorPage />
              </CustomerLayout>
            } 
          />
          <Route 
            path="/advisor" 
            element={
              <CustomerLayout>
                <AdvisorPage />
              </CustomerLayout>
            } 
          />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminPage />} />
          
          {/* Fallback */}
          <Route 
            path="*" 
            element={
              <CustomerLayout>
                <div className="max-w-6xl mx-auto px-6 py-24 text-center">
                  <h1 className="text-2xl font-bold mb-4">Seite nicht gefunden</h1>
                  <p className="text-slate-300">
                    Die angeforderte Seite existiert nicht.
                  </p>
                </div>
              </CustomerLayout>
            } 
          />
        </Routes>
      </ConfiguratorProvider>
    </Router>
  );
}

export default App;