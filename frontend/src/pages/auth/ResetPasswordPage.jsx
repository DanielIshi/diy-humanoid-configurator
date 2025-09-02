import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenError(true);
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (formData.password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || !token) return;

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      await resetPassword(token, formData.password);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Ungültiger Link</h2>
              <p className="text-gray-600 mt-2">
                Der Password-Reset-Link ist ungültig oder fehlt. Bitte fordern Sie einen neuen Link an.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/login?mode=forgot')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
              >
                Neuen Reset-Link anfordern
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
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Passwort erfolgreich zurückgesetzt!</h2>
              <p className="text-gray-600 mt-2">
                Ihr Passwort wurde erfolgreich geändert. Sie können sich nun mit Ihrem neuen Passwort anmelden.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-300 rounded-md p-4 mb-4">
              <p className="text-sm text-blue-700">
                Sie werden in wenigen Sekunden automatisch zur Anmeldung weitergeleitet...
              </p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              Jetzt anmelden
            </button>
          </div>
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
          <p className="text-gray-600 mt-2">Neues Passwort erstellen</p>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Neues Passwort erstellen</h2>
            <p className="text-gray-600 mt-2">
              Geben Sie Ihr neues Passwort ein. Stellen Sie sicher, dass es sicher ist.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Neues Passwort
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Neues, sicheres Passwort"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Mindestens 8 Zeichen mit Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Passwort bestätigen
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                }`}
                placeholder="Passwort wiederholen"
                disabled={isLoading}
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Passwörter stimmen nicht überein</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Passwort wird gesetzt...
                </>
              ) : (
                'Passwort ändern'
              )}
            </button>
          </form>

          <div className="mt-6 text-center pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium transition duration-200"
            >
              ← Zurück zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}