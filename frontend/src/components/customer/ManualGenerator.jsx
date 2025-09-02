import React, { useState } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/solid';
import ManualViewer from './ManualViewer';

/**
 * ManualGenerator - Komponente zum Validieren der Konfiguration und Starten der Manual-Erstellung
 * 
 * Features:
 * - Konfigurationsvalidierung
 * - Abhängigkeitsprüfung
 * - Zeitschätzung vor Generierung
 * - Übergang zum ManualViewer
 */
const ManualGenerator = ({ configuration, onClose }) => {
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);

  React.useEffect(() => {
    validateConfiguration();
  }, [configuration]);

  const validateConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manual/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ configuration })
      });

      if (!response.ok) {
        throw new Error('Validierung fehlgeschlagen');
      }

      const data = await response.json();
      setValidation(data.data);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateManual = () => {
    setShowManual(true);
  };

  if (showManual) {
    return (
      <ManualViewer 
        configuration={configuration}
        onClose={() => setShowManual(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg">Validiere Konfiguration...</span>
      </div>
    );
  }

  if (!validation) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border shadow-sm">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Bauanleitung generieren
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-gray-600">
            Überprüfung Ihrer Konfiguration vor Erstellung der Bauanleitung
          </p>
        </div>

        {/* Validation Status */}
        <div className="p-6">
          <div className={`rounded-lg p-4 mb-6 ${
            validation.isValid 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {validation.isValid ? (
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              ) : (
                <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
              )}
              <h3 className={`ml-3 text-lg font-medium ${
                validation.isValid ? 'text-green-800' : 'text-red-800'
              }`}>
                {validation.isValid 
                  ? 'Konfiguration ist vollständig' 
                  : 'Konfiguration unvollständig'
                }
              </h3>
            </div>
            
            {!validation.isValid && (
              <div className="mt-4">
                <p className="text-red-700 mb-2">
                  Die folgenden Probleme müssen behoben werden:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index} className="text-red-700 text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Warnings */}
          {validation.warnings && validation.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-2">
                <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />
                <h4 className="ml-2 font-medium text-yellow-800">Warnungen</h4>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="text-yellow-700 text-sm">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Dependencies */}
          {validation.missingDependencies && validation.missingDependencies.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-red-800 mb-3">Fehlende Abhängigkeiten:</h4>
              <div className="space-y-2">
                {validation.missingDependencies.map((dep, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium text-red-700">{dep.component}</span>
                    <span className="text-red-600"> benötigt: </span>
                    <span className="text-red-700">{dep.missing.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Estimate */}
          {validation.estimatedTime && validation.isValid && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <ClockIcon className="h-5 w-5 text-blue-500" />
                <h4 className="ml-2 font-medium text-blue-800">Zeitschätzung</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {validation.estimatedTime.formatted.display}
                  </div>
                  <div className="text-blue-700">Gesamtzeit</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {validation.estimatedTime.sessions.recommended}
                  </div>
                  <div className="text-blue-700">Empfohlene Sitzungen (2h)</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {validation.estimatedTime.sessions.intensive}
                  </div>
                  <div className="text-blue-700">Intensive Sitzungen (4h)</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-100 rounded">
                <h5 className="font-medium text-blue-800 mb-2">Zeitaufteilung:</h5>
                <div className="text-blue-700 text-sm">
                  <div>Montage: {validation.estimatedTime.breakdown.assembly} min</div>
                  <div>Puffer (20%): {validation.estimatedTime.breakdown.buffer} min</div>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-800 mb-3">Konfigurationsübersicht:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {Object.entries(configuration.components || {}).map(([type, component]) => {
                if (component && component.selected) {
                  return (
                    <div key={type} className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <span className="font-medium">{type}:</span>
                      <span className="ml-2 text-gray-600">{component.name || type}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>

            <div className="flex space-x-4">
              {!validation.isValid && (
                <button
                  onClick={validateConfiguration}
                  className="px-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                >
                  Erneut prüfen
                </button>
              )}

              <button
                onClick={generateManual}
                disabled={!validation.isValid}
                className={`px-8 py-2 rounded-md font-medium ${
                  validation.isValid
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {validation.isValid 
                  ? 'Bauanleitung erstellen' 
                  : 'Konfiguration unvollständig'
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      {validation.isValid && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Tipps für den Bau:</h4>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Lesen Sie die komplette Anleitung vor Beginn durch</li>
            <li>• Bereiten Sie alle Werkzeuge und Materialien vor</li>
            <li>• Arbeiten Sie in gut beleuchteter Umgebung</li>
            <li>• Nehmen Sie sich Zeit und arbeiten Sie sorgfältig</li>
            <li>• Bei Problemen: Pause machen und Anleitung erneut lesen</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ManualGenerator;