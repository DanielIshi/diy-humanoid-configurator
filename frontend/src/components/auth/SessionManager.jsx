import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function SessionManager() {
  const { sessions, refreshSessions, terminateSession, terminateAllOtherSessions, trustCurrentDevice } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showTrustDevice, setShowTrustDevice] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    refreshSessions();
  }, []);

  const handleTerminateSession = async (sessionId) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Sitzung beenden möchten?')) return;
    
    setIsLoading(true);
    try {
      await terminateSession(sessionId);
    } catch (error) {
      setError('Fehler beim Beenden der Sitzung: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateAllOther = async () => {
    if (!confirm('Sind Sie sicher, dass Sie alle anderen Sitzungen beenden möchten?')) return;
    
    setIsLoading(true);
    try {
      await terminateAllOtherSessions();
    } catch (error) {
      setError('Fehler beim Beenden der Sitzungen: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrustDevice = async () => {
    if (!deviceName.trim()) {
      setError('Bitte geben Sie einen Gerätenamen ein');
      return;
    }

    setIsLoading(true);
    try {
      await trustCurrentDevice(deviceName);
      setShowTrustDevice(false);
      setDeviceName('');
      setError('');
    } catch (error) {
      setError('Fehler beim Vertrauen des Geräts: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  const getBrowserInfo = (userAgent) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unbekannt';
  };

  const getDeviceIcon = (userAgent) => {
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) return '📱';
    if (userAgent.includes('iPad') || userAgent.includes('iPhone')) return '📱';
    return '💻';
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6" data-testid="session-manager">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Aktive Sitzungen</h3>
        <div className="space-x-2">
          <button
            onClick={() => setShowTrustDevice(true)}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition duration-200"
            disabled={isLoading}
          >
            Gerät vertrauen
          </button>
          <button
            onClick={handleTerminateAllOther}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition duration-200"
            disabled={isLoading}
            data-testid="terminate-all-sessions"
          >
            Alle anderen beenden
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Trust Device Modal */}
      {showTrustDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="device-trust-prompt">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Gerät vertrauen</h4>
            <p className="text-gray-600 mb-4">
              Geben Sie diesem Gerät einen Namen, um es als vertrauenswürdig zu markieren.
            </p>
            <div className="mb-4">
              <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 mb-2">
                Gerätename
              </label>
              <input
                type="text"
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Mein Laptop"
                data-testid="device-name"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleTrustDevice}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
                data-testid="trust-device"
              >
                Vertrauen
              </button>
              <button
                onClick={() => setShowTrustDevice(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-200"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4" data-testid="session-list">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Laden der Sitzungen...
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 border rounded-lg ${
                session.isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
              }`}
              data-testid="session-item"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">{getDeviceIcon(session.userAgent)}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getBrowserInfo(session.userAgent)}
                        {session.isCurrent && (
                          <span 
                            className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            data-testid="current-session"
                          >
                            Aktuelle Sitzung
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-600">
                        IP: {session.ipAddress}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Angemeldet: {formatDate(session.createdAt)}</p>
                    <p>Letzte Aktivität: {formatDate(session.lastActivity)}</p>
                    {session.rememberMe && (
                      <p className="text-blue-600">🔒 Angemeldet bleiben aktiviert</p>
                    )}
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => handleTerminateSession(session.id)}
                    disabled={isLoading}
                    className="ml-4 px-3 py-1 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition duration-200"
                    data-testid="terminate-session"
                  >
                    Beenden
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">💡 Sicherheitstipps</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Beenden Sie Sitzungen auf fremden Geräten nach der Nutzung</li>
          <li>• Verwenden Sie "Angemeldet bleiben" nur auf vertrauenswürdigen Geräten</li>
          <li>• Überprüfen Sie regelmäßig Ihre aktiven Sitzungen</li>
          <li>• Vertrauen Sie Geräte für zusätzliche Sicherheit</li>
        </ul>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Wird verarbeitet...</span>
          </div>
        </div>
      )}
    </div>
  );
}