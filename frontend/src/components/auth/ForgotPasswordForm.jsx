import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function ForgotPasswordForm({ onBack, onSuccess }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setFormError('');

    try {
      await forgotPassword(email);
      setIsSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">E-Mail gesendet!</h2>
            <p className="text-gray-600 mt-2">
              Falls ein Account mit dieser E-Mail-Adresse existiert, haben wir Ihnen Anweisungen zum Zurücksetzen Ihres Passworts gesendet.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-300 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Was passiert als nächstes?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Prüfen Sie Ihren E-Mail-Posteingang</li>
                <li>• Schauen Sie auch in Ihren Spam-Ordner</li>
                <li>• Klicken Sie auf den Link in der E-Mail</li>
                <li>• Erstellen Sie ein neues, sicheres Passwort</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                <strong>Wichtig:</strong> Der Reset-Link ist nur 1 Stunde gültig. Falls Sie keine E-Mail erhalten haben, können Sie es erneut versuchen.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                  setFormError('');
                }}
                className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-4 rounded-md transition duration-200"
              >
                Erneut versuchen
              </button>
              <button
                onClick={onBack}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-200"
              >
                Zurück zur Anmeldung
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Passwort vergessen?</h2>
          <p className="text-gray-600 mt-2">
            Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
          </p>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md">
            <p className="text-sm text-red-700">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError) setFormError('');
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ihre.email@beispiel.de"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Wir senden Ihnen eine E-Mail mit weiteren Anweisungen.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                E-Mail wird gesendet...
              </>
            ) : (
              'Reset-Link senden'
            )}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-blue-600 hover:text-blue-500 font-medium transition duration-200"
          >
            ← Zurück zur Anmeldung
          </button>
        </div>
      </div>
    </div>
  );
}