import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PrinterIcon, DocumentDownloadIcon } from '@heroicons/react/outline';
import { CheckCircleIcon, ExclamationIcon, ClockIcon } from '@heroicons/react/solid';

/**
 * ManualViewer - Hauptkomponente für die Anzeige der Bauanleitung
 * 
 * Features:
 * - Schritt-für-Schritt Navigation
 * - Progress Tracking
 * - Print-freundliches Layout
 * - Export-Funktionalität
 */
const ManualViewer = ({ configuration, onClose }) => {
  const [manual, setManual] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => {
    generateManual();
  }, [configuration]);

  const generateManual = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manual/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ configuration })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Generieren der Anleitung');
      }

      const data = await response.json();
      setManual(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markStepCompleted = (stepIndex) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepIndex);
    setCompletedSteps(newCompleted);
  };

  const nextStep = () => {
    if (currentStep < manual.instructions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const exportManual = async (format) => {
    try {
      const response = await fetch(`/api/manual/export/${manual.id}?format=${format}`);
      
      if (format === 'json') {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        downloadFile(blob, `anleitung_${manual.id}.json`);
      } else if (format === 'text') {
        const text = await response.text();
        const blob = new Blob([text], { type: 'text/plain' });
        downloadFile(blob, `anleitung_${manual.id}.txt`);
      }
    } catch (err) {
      alert('Export fehlgeschlagen: ' + err.message);
    }
  };

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printManual = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg">Generiere Bauanleitung...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg">
        <div className="flex items-center">
          <ExclamationIcon className="h-8 w-8 text-red-400" />
          <h3 className="ml-3 text-lg font-medium text-red-800">Fehler</h3>
        </div>
        <p className="mt-2 text-red-700">{error}</p>
        <button 
          onClick={onClose}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          Schließen
        </button>
      </div>
    );
  }

  if (!manual) return null;

  const currentInstruction = manual.instructions[currentStep];
  const progressPercentage = Math.round((completedSteps.size / manual.instructions.length) * 100);

  if (showPrintView) {
    return (
      <PrintView 
        manual={manual} 
        onClose={() => setShowPrintView(false)} 
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            {manual.metadata.title}
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={printManual}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Drucken
            </button>
            <div className="relative">
              <select
                onChange={(e) => exportManual(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 hover:bg-gray-50"
                defaultValue=""
              >
                <option value="" disabled>Export</option>
                <option value="json">JSON</option>
                <option value="text">Text</option>
              </select>
              <DocumentDownloadIcon className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Schließen
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {manual.metadata.estimatedTime.formatted.display}
            </div>
            <div className="text-sm text-gray-600">Geschätzte Zeit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {manual.metadata.totalSteps}
            </div>
            <div className="text-sm text-gray-600">Schritte</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 capitalize">
              {manual.metadata.difficulty}
            </div>
            <div className="text-sm text-gray-600">Schwierigkeit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {progressPercentage}%
            </div>
            <div className="text-sm text-gray-600">Fortschritt</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Fortschritt</span>
            <span>{completedSteps.size} / {manual.instructions.length} Schritte</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Overview */}
        <div className="lg:col-span-1">
          <ManualSidebar 
            manual={manual}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={setCurrentStep}
          />
        </div>

        {/* Main Content - Current Step */}
        <div className="lg:col-span-3">
          <StepViewer
            step={currentInstruction}
            stepNumber={currentStep + 1}
            isCompleted={completedSteps.has(currentStep)}
            onMarkCompleted={() => markStepCompleted(currentStep)}
          />

          {/* Navigation */}
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={previousStep}
              disabled={currentStep === 0}
              className={`flex items-center px-6 py-3 rounded-md ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <ChevronLeftIcon className="h-5 w-5 mr-2" />
              Vorheriger Schritt
            </button>

            <span className="text-sm text-gray-600">
              Schritt {currentStep + 1} von {manual.instructions.length}
            </span>

            <button
              onClick={nextStep}
              disabled={currentStep === manual.instructions.length - 1}
              className={`flex items-center px-6 py-3 rounded-md ${
                currentStep === manual.instructions.length - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Nächster Schritt
              <ChevronRightIcon className="h-5 w-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Sidebar mit Übersicht und Navigation
 */
const ManualSidebar = ({ manual, currentStep, completedSteps, onStepClick }) => {
  return (
    <div className="space-y-6">
      {/* Werkzeuge */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Benötigte Werkzeuge</h3>
        <ul className="space-y-2 text-sm">
          {manual.overview.requiredTools.slice(0, 5).map((tool, index) => (
            <li key={index} className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                tool.essential ? 'bg-red-500' : 'bg-blue-500'
              }`}></div>
              {tool.name}
            </li>
          ))}
          {manual.overview.requiredTools.length > 5 && (
            <li className="text-gray-500">
              +{manual.overview.requiredTools.length - 5} weitere...
            </li>
          )}
        </ul>
      </div>

      {/* Sicherheitshinweise */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
          <ExclamationIcon className="h-5 w-5 mr-2" />
          Sicherheit
        </h3>
        <ul className="space-y-1 text-sm text-yellow-700">
          {manual.overview.safetyNotes.slice(0, 3).map((note, index) => (
            <li key={index}>• {note}</li>
          ))}
        </ul>
      </div>

      {/* Schritt-Navigation */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Schritte</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {manual.instructions.map((step, index) => (
            <button
              key={step.id}
              onClick={() => onStepClick(index)}
              className={`w-full text-left p-2 rounded text-sm transition-colors ${
                index === currentStep
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : completedSteps.has(index)
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-2">
                  {completedSteps.has(index) ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      index === currentStep ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      <div className="w-full h-full text-xs flex items-center justify-center text-gray-500">
                        {index + 1}
                      </div>
                    </div>
                  )}
                </div>
                <div className="truncate">{step.title}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Anzeige eines einzelnen Schritts
 */
const StepViewer = ({ step, stepNumber, isCompleted, onMarkCompleted }) => {
  return (
    <div className="bg-white border rounded-lg p-6">
      {/* Step Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
            isCompleted ? 'bg-green-500' : 'bg-blue-500'
          }`}>
            {isCompleted ? <CheckCircleIcon className="h-6 w-6" /> : stepNumber}
          </div>
          <h2 className="ml-4 text-xl font-semibold text-gray-900">
            {step.title}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            {step.estimatedTime}min
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            step.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
            step.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            step.difficulty === 'hard' ? 'bg-orange-100 text-orange-800' :
            'bg-red-100 text-red-800'
          }`}>
            {step.difficulty}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="prose max-w-none">
        <p className="text-gray-700 mb-6">{step.description}</p>

        {/* Sub-steps */}
        {step.steps && step.steps.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Arbeitsschritte:</h4>
            <ol className="space-y-2">
              {step.steps.map((substep, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center justify-center mr-3 mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{substep}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Tools & Materials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {step.tools && step.tools.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Benötigte Werkzeuge:</h4>
              <ul className="space-y-1">
                {step.tools.map((tool, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                    {tool}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step.materials && step.materials.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Materialien:</h4>
              <ul className="space-y-1">
                {step.materials.map((material, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                    {material}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Warnings */}
        {step.warnings && step.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
              <ExclamationIcon className="h-5 w-5 mr-2" />
              Warnhinweise:
            </h4>
            <ul className="space-y-1">
              {step.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-yellow-700">
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tips */}
        {step.tips && step.tips.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">Tipps:</h4>
            <ul className="space-y-1">
              {step.tips.map((tip, index) => (
                <li key={index} className="text-sm text-blue-700">
                  💡 {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-6 pt-6 border-t">
        <button
          onClick={onMarkCompleted}
          disabled={isCompleted}
          className={`px-6 py-3 rounded-md font-medium ${
            isCompleted
              ? 'bg-green-100 text-green-800 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircleIcon className="h-5 w-5 inline mr-2" />
              Schritt abgeschlossen
            </>
          ) : (
            'Schritt als erledigt markieren'
          )}
        </button>
      </div>
    </div>
  );
};

/**
 * Print-freundliche Ansicht
 */
const PrintView = ({ manual, onClose }) => {
  return (
    <div className="print:block">
      <div className="print:hidden mb-4 text-right">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Zurück zur normalen Ansicht
        </button>
      </div>
      
      <div className="print:text-black print:bg-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">{manual.metadata.title}</h1>
          <p className="text-gray-600 mt-2">
            Generiert am {new Date(manual.metadata.generated).toLocaleDateString('de-DE')}
          </p>
          <p className="text-gray-600">
            Geschätzte Zeit: {manual.metadata.estimatedTime.formatted.display} | 
            Schwierigkeit: {manual.metadata.difficulty}
          </p>
        </div>

        {/* Tools & Safety */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Benötigte Werkzeuge</h2>
            <ul className="space-y-1">
              {manual.overview.requiredTools.map((tool, index) => (
                <li key={index} className="text-sm">
                  • {tool.name}
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Sicherheitshinweise</h2>
            <ul className="space-y-1">
              {manual.overview.safetyNotes.map((note, index) => (
                <li key={index} className="text-sm">
                  ⚠ {note}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Instructions */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Bauanleitung</h2>
          {manual.instructions.map((step, index) => (
            <div key={step.id} className="mb-8 break-inside-avoid">
              <h3 className="text-lg font-semibold mb-2">
                {index + 1}. {step.title}
              </h3>
              <p className="text-gray-700 mb-3">{step.description}</p>
              
              {step.steps && step.steps.length > 0 && (
                <ol className="ml-6 mb-3 space-y-1">
                  {step.steps.map((substep, subIndex) => (
                    <li key={subIndex} className="text-sm">
                      {subIndex + 1}. {substep}
                    </li>
                  ))}
                </ol>
              )}

              {step.warnings && step.warnings.length > 0 && (
                <div className="bg-gray-100 p-3 rounded mb-3">
                  <p className="font-semibold text-sm">Warnhinweise:</p>
                  {step.warnings.map((warning, wIndex) => (
                    <p key={wIndex} className="text-sm">⚠ {warning}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManualViewer;