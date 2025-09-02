import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function ProtectedRoute({ children, requireRole = null, requireVerified = false }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authentifizierung wird überprüft...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  // Check email verification requirement
  if (requireVerified && !user?.emailVerified) {
    return <EmailVerificationPrompt />;
  }

  // Check role requirement
  if (requireRole && user?.role) {
    const userRole = user.role.toLowerCase();
    const requiredRoles = Array.isArray(requireRole) 
      ? requireRole.map(r => r.toLowerCase()) 
      : [requireRole.toLowerCase()];
    
    if (!requiredRoles.includes(userRole)) {
      return <AccessDenied requiredRoles={requiredRoles} userRole={userRole} />;
    }
  }

  // User is authenticated and authorized
  return children;
}

function LoginPrompt() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Anmeldung erforderlich</h2>
          <p className="text-gray-600 mt-2">
            Sie müssen sich anmelden, um auf diesen Bereich zugreifen zu können.
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Zur Anmeldung
          </button>
          <button
            onClick={() => window.location.href = '/register'}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Account erstellen
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailVerificationPrompt() {
  const { user, resendVerification } = useAuth();
  const [isResending, setIsResending] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState('');

  const handleResendVerification = async () => {
    if (isResending) return;

    setIsResending(true);
    setResendStatus('');

    try {
      await resendVerification(user.email);
      setResendStatus('success');
    } catch (error) {
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">E-Mail-Verifikation erforderlich</h2>
          <p className="text-gray-600 mt-2">
            Bitte verifizieren Sie Ihre E-Mail-Adresse, um auf alle Funktionen zugreifen zu können.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Wir haben eine Verifikations-E-Mail an <strong>{user?.email}</strong> gesendet.
          </p>
        </div>

        {resendStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-md">
            <p className="text-sm text-green-700">
              Verifikations-E-Mail wurde erneut gesendet. Bitte prüfen Sie Ihren Posteingang.
            </p>
          </div>
        )}

        {resendStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md">
            <p className="text-sm text-red-700">
              Fehler beim Senden der E-Mail. Bitte versuchen Sie es später erneut.
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            {isResending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                E-Mail wird gesendet...
              </>
            ) : (
              'Verifikations-E-Mail erneut senden'
            )}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Seite aktualisieren
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessDenied({ requiredRoles, userRole }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Zugriff verweigert</h2>
          <p className="text-gray-600 mt-2">
            Sie haben nicht die erforderlichen Berechtigungen für diesen Bereich.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <p><strong>Ihre Rolle:</strong> {userRole}</p>
            <p><strong>Erforderliche Rolle(n):</strong> {requiredRoles.join(', ')}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Zurück
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    </div>
  );
}