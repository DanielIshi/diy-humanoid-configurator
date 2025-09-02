import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../../components/auth/LoginForm';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { ForgotPasswordForm } from '../../components/auth/ForgotPasswordForm';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const [mode, setMode] = useState('login');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Set initial mode based on URL or query params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const modeParam = searchParams.get('mode');
    if (modeParam && ['login', 'register', 'forgot'].includes(modeParam)) {
      setMode(modeParam);
    }
  }, [location.search]);

  const handleSuccess = () => {
    const redirectTo = location.state?.from?.pathname || '/';
    navigate(redirectTo, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authentifizierung wird überprüft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">DIY Humanoid Configurator</h1>
          <p className="text-gray-600 mt-2">Ihr Partner für humanoide Roboter-Konfiguration</p>
        </div>

        {/* Auth Forms */}
        {mode === 'login' && (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToRegister={() => setMode('register')}
            onSwitchToForgotPassword={() => setMode('forgot')}
          />
        )}

        {mode === 'register' && (
          <RegisterForm
            onSuccess={() => setMode('registerSuccess')}
            onSwitchToLogin={() => setMode('login')}
          />
        )}

        {mode === 'forgot' && (
          <ForgotPasswordForm
            onBack={() => setMode('login')}
            onSuccess={() => setMode('login')}
          />
        )}

        {mode === 'registerSuccess' && (
          <RegistrationSuccess onSwitchToLogin={() => setMode('login')} />
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          © 2024 DIY Humanoid Configurator. Alle Rechte vorbehalten.
        </p>
        <div className="mt-2 space-x-4">
          <a href="/privacy" className="hover:text-gray-700 transition duration-200">
            Datenschutz
          </a>
          <a href="/terms" className="hover:text-gray-700 transition duration-200">
            AGB
          </a>
          <a href="/support" className="hover:text-gray-700 transition duration-200">
            Support
          </a>
        </div>
      </div>
    </div>
  );
}

function RegistrationSuccess({ onSwitchToLogin }) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Willkommen!</h2>
          <p className="text-gray-600 mt-2">
            Ihr Account wurde erfolgreich erstellt. Bitte verifizieren Sie Ihre E-Mail-Adresse.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-300 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Was passiert als nächstes?</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Prüfen Sie Ihren E-Mail-Posteingang</li>
              <li>Klicken Sie auf den Bestätigungslink</li>
              <li>Melden Sie sich mit Ihren neuen Zugangsdaten an</li>
              <li>Beginnen Sie mit der Konfiguration Ihres Humanoids</li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              <strong>Wichtiger Hinweis:</strong> Der Bestätigungslink ist 24 Stunden gültig. 
              Schauen Sie auch in Ihren Spam-Ordner, falls Sie keine E-Mail erhalten haben.
            </p>
          </div>

          <button
            onClick={onSwitchToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    </div>
  );
}