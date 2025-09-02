import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }) {
  const [mode, setMode] = useState(defaultMode);

  if (!isOpen) return null;

  const handleSuccess = () => {
    // Close modal and reload or redirect
    onClose();
    // Optionally refresh the page or redirect
    window.location.reload();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        {/* Content */}
        <div className="p-6">
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
      </div>
    </div>
  );
}

function RegistrationSuccess({ onSwitchToLogin }) {
  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Registrierung erfolgreich!</h2>
        <p className="text-gray-600 mt-2">
          Ihr Account wurde erfolgreich erstellt. Wir haben Ihnen eine Bestätigungs-E-Mail gesendet.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-300 rounded-md p-4 text-left">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Nächste Schritte:</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Prüfen Sie Ihren E-Mail-Posteingang</li>
            <li>Klicken Sie auf den Bestätigungslink</li>
            <li>Melden Sie sich mit Ihren Zugangsdaten an</li>
          </ol>
        </div>

        <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4 text-left">
          <p className="text-sm text-yellow-800">
            <strong>Hinweis:</strong> Der Bestätigungslink ist 24 Stunden gültig. 
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
  );
}