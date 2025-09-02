import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const [status, setStatus] = useState('loading'); // loading, success, error
  const [error, setError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Verifikationstoken fehlt oder ist ungültig');
      return;
    }

    const verifyToken = async () => {
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (error) {
        setStatus('error');
        setError(error.message);
      }
    };

    verifyToken();
  }, [token, verifyEmail]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white shadow-lg rounded-lg p-8 text-center">
            <div className="mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900">E-Mail wird verifiziert...</h2>
              <p className="text-gray-600 mt-2">
                Bitte warten Sie, während wir Ihre E-Mail-Adresse bestätigen.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">E-Mail erfolgreich verifiziert!</h2>
              <p className="text-gray-600 mt-2">
                Ihr Account ist jetzt vollständig aktiviert. Sie können alle Funktionen nutzen.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-300 rounded-md p-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">Was können Sie jetzt tun?</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✓ Humanoide Roboter konfigurieren</li>
                  <li>✓ Bestellungen aufgeben</li>
                  <li>✓ Montageanleitungen herunterladen</li>
                  <li>✓ Support kontaktieren</li>
                  <li>✓ Konfigurationen speichern und teilen</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/configurator')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition duration-200"
                >
                  Jetzt Roboter konfigurieren
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-200"
                >
                  Zur Anmeldung
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verifikation fehlgeschlagen</h2>
            <p className="text-gray-600 mt-2">
              Es gab ein Problem bei der Verifikation Ihrer E-Mail-Adresse.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-300 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Mögliche Ursachen:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Der Verifikationslink ist abgelaufen (24h Gültigkeit)</li>
                <li>• Der Link wurde bereits verwendet</li>
                <li>• Der Link ist beschädigt oder unvollständig</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/login?mode=register')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
              >
                Neuen Verifikationslink anfordern
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-200"
              >
                Zur Anmeldung
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 px-4 transition duration-200"
              >
                Zur Startseite
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}