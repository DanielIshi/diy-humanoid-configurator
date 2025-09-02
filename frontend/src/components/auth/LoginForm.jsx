import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function LoginForm({ onSuccess, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { login, clearError } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (formError) setFormError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setFormError('');

    try {
      await login(formData.email, formData.password, formData.rememberMe);
      if (onSuccess) onSuccess();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Anmelden</h2>
          <p className="text-gray-600 mt-2">
            Melden Sie sich in Ihrem Account an
          </p>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md" data-testid="login-error">
            <p className="text-sm text-red-700">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ihre.email@beispiel.de"
              disabled={isLoading}
              data-testid="login-email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ihr Passwort"
              disabled={isLoading}
              data-testid="login-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
                data-testid="login-remember-me"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700">
                Angemeldet bleiben
              </label>
            </div>
            <div>
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-500 transition duration-200"
                data-testid="forgot-password-link"
              >
                Passwort vergessen?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.email || !formData.password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
            data-testid="login-submit"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Anmelden...
              </>
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="text-center pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">Noch kein Account? </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium transition duration-200"
              data-testid="auth-register-link"
            >
              Hier registrieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}