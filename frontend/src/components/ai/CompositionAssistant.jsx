import React, { useState, useRef } from 'react';
import { Sparkles, Wand2, DollarSign, Clock, Target, Zap, AlertCircle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';

const CompositionAssistant = ({ 
  onConfigurationGenerated = null,
  onClose = null 
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    description: '',
    budget: '',
    skillLevel: 'beginner',
    useCase: 'general',
    requirements: {
      mobility: false,
      manipulation: false,
      vision: false,
      audio: false,
      wireless: false,
      autonomous: false
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const textareaRef = useRef(null);

  const useCases = [
    { id: 'learning', label: 'Lernroboter', icon: '🎓', description: 'Ideal für Bildungszwecke' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎪', description: 'Unterhaltung und Demos' },
    { id: 'assistant', label: 'Haushalts-Assistent', icon: '🏠', description: 'Einfache Haushaltsaufgaben' },
    { id: 'research', label: 'Forschungsplattform', icon: '🔬', description: 'Experimente und Tests' },
    { id: 'competition', label: 'Wettbewerbs-Roboter', icon: '🏆', description: 'Robotik-Wettbewerbe' },
    { id: 'general', label: 'Allzweck', icon: '🤖', description: 'Vielseitig einsetzbar' }
  ];

  const skillLevels = [
    { id: 'beginner', label: 'Anfänger', description: 'Erste Schritte in der Robotik', color: 'bg-green-100 text-green-800' },
    { id: 'intermediate', label: 'Fortgeschrittener', description: 'Grundkenntnisse vorhanden', color: 'bg-blue-100 text-blue-800' },
    { id: 'advanced', label: 'Experte', description: 'Erfahrung mit komplexen Projekten', color: 'bg-purple-100 text-purple-800' }
  ];

  const requirements = [
    { id: 'mobility', label: 'Beweglichkeit', icon: '🚶', description: 'Laufen und Gehen' },
    { id: 'manipulation', label: 'Greifen', icon: '🤏', description: 'Objekte greifen und manipulieren' },
    { id: 'vision', label: 'Sehen', icon: '👁️', description: 'Kameras und Bilderkennung' },
    { id: 'audio', label: 'Hören/Sprechen', icon: '🎤', description: 'Sprach-Ein- und Ausgabe' },
    { id: 'wireless', label: 'WLAN/Bluetooth', icon: '📡', description: 'Drahtlose Kommunikation' },
    { id: 'autonomous', label: 'Autonomie', icon: '🧠', description: 'Selbstständige Navigation' }
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    setError(null);
  };

  const generateConfiguration = async () => {
    if (!formData.description.trim()) {
      setError('Bitte beschreibe deinen gewünschten Roboter');
      textareaRef.current?.focus();
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Generieren der Konfiguration');
      }

      setResult(data);
      setStep(4); // Zu Ergebnis-Step wechseln

      if (onConfigurationGenerated) {
        onConfigurationGenerated(data.configuration);
      }

    } catch (error) {
      console.error('Generation Error:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      description: '',
      budget: '',
      skillLevel: 'beginner',
      useCase: 'general',
      requirements: {
        mobility: false,
        manipulation: false,
        vision: false,
        audio: false,
        wireless: false,
        autonomous: false
      }
    });
    setResult(null);
    setError(null);
  };

  const renderProgressBar = () => (
    <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
      <div 
        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${(step / 4) * 100}%` }}
      />
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Wand2 className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Beschreibe deinen Traum-Roboter
        </h3>
        <p className="text-gray-600">
          Erzähle mir, was dein Roboter können soll und wofür du ihn verwenden möchtest.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Was soll dein Roboter machen? *
        </label>
        <textarea
          ref={textareaRef}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="z.B. Ich möchte einen Roboter bauen, der mir im Haushalt hilft, Gegenstände greifen kann und mit mir sprechen kann..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Sei so detailliert wie möglich - das hilft mir bei der Auswahl der richtigen Komponenten!
        </p>
      </div>

      <button
        onClick={() => setStep(2)}
        disabled={!formData.description.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        <span>Weiter</span>
        <ArrowRight size={16} />
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Target className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Verwendungszweck & Anforderungen
        </h3>
        <p className="text-gray-600">
          Hilf mir zu verstehen, wofür du den Roboter hauptsächlich verwenden möchtest.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Hauptverwendung
        </label>
        <div className="grid grid-cols-2 gap-3">
          {useCases.map((useCase) => (
            <button
              key={useCase.id}
              onClick={() => handleInputChange('useCase', useCase.id)}
              className={`p-3 border rounded-lg text-left transition-all ${
                formData.useCase === useCase.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{useCase.icon}</span>
                <span className="font-medium text-sm">{useCase.label}</span>
              </div>
              <p className="text-xs text-gray-600">{useCase.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Gewünschte Fähigkeiten (optional)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {requirements.map((req) => (
            <label
              key={req.id}
              className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all ${
                formData.requirements[req.id]
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.requirements[req.id]}
                onChange={(e) => handleInputChange(`requirements.${req.id}`, e.target.checked)}
                className="sr-only"
              />
              <span className="text-lg">{req.icon}</span>
              <div>
                <div className="font-medium text-sm">{req.label}</div>
                <div className="text-xs text-gray-600">{req.description}</div>
              </div>
              {formData.requirements[req.id] && (
                <CheckCircle size={16} className="text-blue-600 ml-auto" />
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setStep(1)}
          className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Zurück
        </button>
        <button
          onClick={() => setStep(3)}
          className="flex-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <span>Weiter</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <DollarSign className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Budget & Erfahrung
        </h3>
        <p className="text-gray-600">
          Abschließende Details für die perfekte Konfiguration.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dein Erfahrungslevel
        </label>
        <div className="space-y-2">
          {skillLevels.map((level) => (
            <label
              key={level.id}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                formData.skillLevel === level.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="skillLevel"
                value={level.id}
                checked={formData.skillLevel === level.id}
                onChange={(e) => handleInputChange('skillLevel', e.target.value)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{level.label}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${level.color}`}>
                    {level.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{level.description}</p>
              </div>
              {formData.skillLevel === level.id && (
                <CheckCircle size={16} className="text-blue-600 ml-3" />
              )}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Budget (optional)
        </label>
        <div className="relative">
          <input
            type="number"
            value={formData.budget}
            onChange={(e) => handleInputChange('budget', e.target.value)}
            placeholder="z.B. 500"
            min="50"
            max="5000"
            step="50"
            className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-2 text-gray-500">€</span>
          <span className="absolute right-3 top-2 text-sm text-gray-400">EUR</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Lass das Feld leer für budgetunabhängige Empfehlungen
        </p>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setStep(2)}
          className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Zurück
        </button>
        <button
          onClick={generateConfiguration}
          disabled={isGenerating}
          className="flex-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
        >
          {isGenerating ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Generiere Konfiguration...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>KI-Konfiguration erstellen</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      {result?.success ? (
        <>
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Konfiguration erstellt!
            </h3>
            <p className="text-gray-600">
              Hier ist dein personalisierter Roboter basierend auf deinen Anforderungen.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-bold text-gray-900">
                {result.configuration?.configuration?.name || 'Dein Roboter'}
              </h4>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  €{result.configuration?.configuration?.estimatedCost || 'N/A'}
                </div>
                <div className="text-sm text-gray-600 flex items-center">
                  <Clock size={12} className="mr-1" />
                  {result.configuration?.configuration?.buildTime || 'N/A'}
                </div>
              </div>
            </div>
            
            <p className="text-gray-700 mb-3">
              {result.configuration?.configuration?.description}
            </p>

            <div className="flex items-center space-x-4 text-sm">
              <span className={`px-2 py-1 rounded-full ${
                result.configuration?.configuration?.difficulty === 'beginner' 
                  ? 'bg-green-100 text-green-800'
                  : result.configuration?.configuration?.difficulty === 'intermediate'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
              }`}>
                {result.configuration?.configuration?.difficulty === 'beginner' ? 'Anfänger' :
                 result.configuration?.configuration?.difficulty === 'intermediate' ? 'Fortgeschrittener' : 'Experte'}
              </span>
              <span className="text-gray-600">
                {result.configuration?.components?.length || 0} Komponenten
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="font-semibold text-gray-900">Hauptkomponenten:</h5>
            {result.configuration?.components?.slice(0, 5).map((component, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{component.item}</div>
                  <div className="text-sm text-gray-600">{component.reason}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">€{component.price}</div>
                  <div className="text-sm text-gray-600">×{component.quantity}</div>
                </div>
              </div>
            ))}
            {result.configuration?.components?.length > 5 && (
              <div className="text-center text-sm text-gray-600">
                ... und {result.configuration.components.length - 5} weitere Komponenten
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={resetForm}
              className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Neue Konfiguration
            </button>
            <button
              onClick={() => {
                if (onConfigurationGenerated) {
                  onConfigurationGenerated(result.configuration);
                }
                onClose?.();
              }}
              className="flex-2 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>Konfiguration verwenden</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Fehler beim Generieren
          </h3>
          <p className="text-gray-600 mb-4">
            {result?.error || 'Unbekannter Fehler'}
          </p>
          <button
            onClick={() => setStep(3)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <Sparkles className="h-8 w-8 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">KI-Kompositions-Assistent</h2>
        </div>
        <p className="text-gray-600">
          Lass dir von der KI eine perfekte Roboter-Konfiguration erstellen
        </p>
      </div>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle size={16} className="text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Steps */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}

      {/* Footer */}
      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          Powered by KI • Schritt {step} von 4
        </p>
      </div>
    </div>
  );
};

export default CompositionAssistant;