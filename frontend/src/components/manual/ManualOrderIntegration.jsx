// Manual Order Integration Component
// Integriert AI-Manual-Generierung in den Bestellprozess

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui';
import { 
  FileText, 
  Zap, 
  Download, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Eye
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import AIManualPreview from './AIManualPreview';

const ManualOrderIntegration = ({ 
  order, 
  configuration, 
  onManualGenerated,
  className = "" 
}) => {
  const { user } = useAuth();
  const [includeManual, setIncludeManual] = useState(true);
  const [manualOptions, setManualOptions] = useState({
    skillLevel: 'beginner',
    language: 'de-DE',
    includeImages: true,
    includeVideos: false
  });
  const [generatingManual, setGeneratingManual] = useState(false);
  const [generatedManual, setGeneratedManual] = useState(null);
  const [error, setError] = useState(null);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Schätze Token-Verbrauch basierend auf Komponenten
  useEffect(() => {
    if (configuration && configuration.components) {
      const componentCount = Object.keys(configuration.components).length;
      const baseTokens = 2000; // Base-Tokens für Template
      const tokensPerComponent = 800; // Tokens pro Komponente
      const complexityMultiplier = manualOptions.skillLevel === 'beginner' ? 1.3 : 
                                   manualOptions.skillLevel === 'advanced' ? 0.8 : 1.0;
      
      const estimated = Math.round((baseTokens + (componentCount * tokensPerComponent)) * complexityMultiplier);
      setEstimatedTokens(estimated);
    }
  }, [configuration, manualOptions.skillLevel]);

  const generateManual = async () => {
    if (!order?.id || !configuration) {
      setError('Bestellung oder Konfiguration fehlt');
      return;
    }

    setGeneratingManual(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-manual/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order.id,
          components: configuration.components,
          customerName: user.name || user.email,
          userSkillLevel: manualOptions.skillLevel,
          totalPrice: order.total,
          options: {
            language: manualOptions.language,
            includeImages: manualOptions.includeImages,
            includeVideos: manualOptions.includeVideos,
            format: 'comprehensive'
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedManual(data.manual);
        if (onManualGenerated) {
          onManualGenerated(data.manual);
        }
      } else {
        throw new Error(data.message || 'Manual-Generierung fehlgeschlagen');
      }
    } catch (err) {
      setError(`Fehler bei Manual-Generierung: ${err.message}`);
    } finally {
      setGeneratingManual(false);
    }
  };

  const getSkillLevelDescription = (level) => {
    switch (level) {
      case 'beginner':
        return 'Detaillierte Erklärungen, mehr Sicherheitshinweise, grundlegende Schritte';
      case 'intermediate':
        return 'Ausgewogene Anleitung mit Fokus auf wichtige Punkte';
      case 'advanced':
        return 'Kompakte Anleitung für Erfahrene, technische Details';
      default:
        return '';
    }
  };

  const getRobotTypeFromConfiguration = (config) => {
    if (!config || !config.components) return 'Unbekannt';
    
    // Heuristik zur Roboter-Typ-Erkennung
    const components = Object.keys(config.components);
    if (components.some(c => c.includes('humanoid') || c.includes('biped'))) {
      return 'Humanoid';
    }
    if (components.some(c => c.includes('quadruped') || c.includes('dog'))) {
      return 'Quadruped';
    }
    if (components.some(c => c.includes('arm') || c.includes('manipulator'))) {
      return 'Roboterarm';
    }
    return 'Allzweck-Roboter';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Manual Option Card */}
      <Card className={`transition-all duration-200 ${includeManual ? 'ring-2 ring-blue-500' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${includeManual ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI-Bauanleitung</h3>
                <p className="text-sm text-gray-600">
                  Personalisierte Schritt-für-Schritt Anleitung für Ihre Konfiguration
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700">
                <Sparkles className="h-3 w-3 mr-1" />
                KI-generiert
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="include-manual"
              checked={includeManual}
              onCheckedChange={setIncludeManual}
            />
            <label htmlFor="include-manual" className="text-sm font-medium">
              AI-Bauanleitung zu Bestellung hinzufügen
            </label>
          </div>
        </CardHeader>

        {includeManual && (
          <CardContent className="space-y-4">
            {/* Konfiguration Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Ihre Konfiguration:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Roboter-Typ:</span>
                  <span className="ml-2 font-medium">{getRobotTypeFromConfiguration(configuration)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Komponenten:</span>
                  <span className="ml-2 font-medium">
                    {configuration?.components ? Object.keys(configuration.components).length : 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Geschätzte Seiten:</span>
                  <span className="ml-2 font-medium">{Math.ceil(estimatedTokens / 400)}</span>
                </div>
                <div>
                  <span className="text-gray-600">AI-Tokens:</span>
                  <span className="ml-2 font-medium text-purple-600">~{estimatedTokens.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Manual Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Skill-Level</label>
                <Select 
                  value={manualOptions.skillLevel}
                  onValueChange={(value) => setManualOptions({...manualOptions, skillLevel: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">
                      <div>
                        <div className="font-medium">Anfänger</div>
                        <div className="text-xs text-gray-500">Detaillierte Erklärungen</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="intermediate">
                      <div>
                        <div className="font-medium">Fortgeschritten</div>
                        <div className="text-xs text-gray-500">Ausgewogene Anleitung</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="advanced">
                      <div>
                        <div className="font-medium">Experte</div>
                        <div className="text-xs text-gray-500">Kompakte Anleitung</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {getSkillLevelDescription(manualOptions.skillLevel)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sprache</label>
                <Select 
                  value={manualOptions.language}
                  onValueChange={(value) => setManualOptions({...manualOptions, language: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de-DE">Deutsch</SelectItem>
                    <SelectItem value="en-US">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Zusätzliche Optionen</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <Checkbox 
                    checked={manualOptions.includeImages}
                    onCheckedChange={(checked) => setManualOptions({...manualOptions, includeImages: checked})}
                  />
                  <span className="text-sm">Bilder und Diagramme einschließen</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox 
                    checked={manualOptions.includeVideos}
                    onCheckedChange={(checked) => setManualOptions({...manualOptions, includeVideos: checked})}
                    disabled
                  />
                  <span className="text-sm text-gray-400">Video-Anleitungen (Bald verfügbar)</span>
                </label>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Generation Progress */}
            {generatingManual && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">KI erstellt Ihre Bauanleitung...</span>
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <Progress className="w-full" />
                <p className="text-xs text-gray-500">
                  Dies kann 2-5 Minuten dauern. Die KI analysiert Ihre Komponenten und 
                  erstellt eine maßgeschneiderte Anleitung.
                </p>
              </div>
            )}

            {/* Success State */}
            {generatedManual && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-green-800">Bauanleitung erfolgreich erstellt!</div>
                      <div className="text-sm text-green-700">
                        {generatedManual.pages} Seiten, geschätzte Bauzeit: {generatedManual.estimatedBuildTime}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowPreview(true)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Vorschau
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Generation Button */}
            <div className="flex justify-between items-center pt-4">
              <div className="text-xs text-gray-500">
                <Zap className="h-3 w-3 inline mr-1" />
                Kostenlos für alle Bestellungen
              </div>
              
              {!generatedManual && (
                <Button 
                  onClick={generateManual}
                  disabled={generatingManual || !configuration}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {generatingManual ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Anleitung generieren
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Manual Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Bauanleitung Vorschau</DialogTitle>
            <DialogDescription>
              Ihre personalisierte AI-generierte Bauanleitung
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            {generatedManual && (
              <AIManualPreview 
                manualId={generatedManual.id}
                orderId={order?.id}
                onClose={() => setShowPreview(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">Was Sie erhalten</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Personalisierte Schritt-für-Schritt Bauanleitung</li>
                <li>• Sicherheitshinweise und Werkzeugempfehlungen</li>
                <li>• Troubleshooting für häufige Probleme</li>
                <li>• Quellenangaben zu Original-Handbüchern</li>
                <li>• PDF-Download für offline Nutzung</li>
              </ul>
              <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-700">
                <strong>Rechtlicher Hinweis:</strong> Die AI-Anleitung dient als Hilfestellung. 
                Konsultieren Sie bei Problemen die Original-Handbücher der Hersteller.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualOrderIntegration;