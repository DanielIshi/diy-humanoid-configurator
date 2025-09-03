// AI Manual Preview Component
// Zeigt Vorschau der AI-generierten Bauanleitungen mit Download-Option

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent,
  Button,
  Badge,
  Separator,
  ScrollArea,
  Alert,
  AlertDescription,
  Progress,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui';
import { 
  Download, 
  Eye, 
  Clock, 
  Zap, 
  AlertTriangle,
  FileText,
  Printer,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatFileSize } from '../../utils/formatters';

const AIManualPreview = ({ manualId, orderId, onClose }) => {
  const { user } = useAuth();
  const [manual, setManual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    format: 'A4',
    includeImages: true,
    includeTableOfContents: true,
    watermark: false
  });

  // Manual laden
  useEffect(() => {
    if (manualId) {
      loadManual();
    }
  }, [manualId]);

  const loadManual = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai-manual/${manualId}?includeContent=true`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Manual konnte nicht geladen werden');
      }

      const data = await response.json();
      if (data.success) {
        setManual(data.manual);
      } else {
        throw new Error(data.error || 'Unbekannter Fehler');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = async () => {
    setGeneratingPdf(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai-manual/${manualId}/pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ options: pdfOptions })
      });

      const data = await response.json();
      
      if (data.success) {
        // Manual neu laden um PDF-Status zu aktualisieren
        await loadManual();
        
        // Erfolg-Nachricht zeigen
        setTimeout(() => {
          alert(`PDF erfolgreich generiert! ${data.pdf.pages} Seiten, ${formatFileSize(data.pdf.size)}`);
        }, 100);
      } else {
        throw new Error(data.message || 'PDF-Generierung fehlgeschlagen');
      }
    } catch (err) {
      setError(`PDF-Generierung fehlgeschlagen: ${err.message}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const downloadPdf = async () => {
    try {
      const response = await fetch(`/api/ai-manual/${manualId}/download`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${manual?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'manual'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Download fehlgeschlagen');
      }
    } catch (err) {
      setError(`Download fehlgeschlagen: ${err.message}`);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'generating': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4"
                onClick={loadManual}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Erneut versuchen
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!manual) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Manual nicht gefunden oder noch nicht generiert.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              {manual.title}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Bestellung: #{manual.orderId}</span>
              <span>•</span>
              <span>Generiert: {formatDate(manual.generatedAt)}</span>
              <span>•</span>
              <div className={`flex items-center ${getStatusColor(manual.status)}`}>
                {manual.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 mr-1" />
                ) : manual.status === 'failed' ? (
                  <XCircle className="h-4 w-4 mr-1" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                )}
                {manual.status}
              </div>
            </div>
          </div>
          
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
        
        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="secondary" className="capitalize">
            {manual.robotType}
          </Badge>
          <Badge className={getDifficultyColor(manual.difficulty)}>
            {manual.difficulty}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {Math.floor(manual.estimatedBuildTime / 60)}h {manual.estimatedBuildTime % 60}min
          </Badge>
          {manual.content?.metadata?.aiTokensUsed && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {manual.content.metadata.aiTokensUsed} Tokens
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {manual.pdfGenerated ? (
            <Button onClick={downloadPdf} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              PDF Herunterladen
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  PDF Generieren
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>PDF-Optionen</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Format</label>
                    <select 
                      value={pdfOptions.format}
                      onChange={(e) => setPdfOptions({...pdfOptions, format: e.target.value})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="A4">A4</option>
                      <option value="Letter">Letter</option>
                      <option value="A3">A3</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfOptions.includeImages}
                        onChange={(e) => setPdfOptions({...pdfOptions, includeImages: e.target.checked})}
                      />
                      <span className="text-sm">Bilder einschließen</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfOptions.includeTableOfContents}
                        onChange={(e) => setPdfOptions({...pdfOptions, includeTableOfContents: e.target.checked})}
                      />
                      <span className="text-sm">Inhaltsverzeichnis</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfOptions.watermark}
                        onChange={(e) => setPdfOptions({...pdfOptions, watermark: e.target.checked})}
                      />
                      <span className="text-sm">Wasserzeichen "AI-GENERIERT"</span>
                    </label>
                  </div>
                  
                  <Button 
                    onClick={generatePdf} 
                    disabled={generatingPdf}
                    className="w-full"
                  >
                    {generatingPdf ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generiere PDF...
                      </>
                    ) : (
                      <>
                        <Printer className="h-4 w-4 mr-2" />
                        PDF Erstellen
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          <Button variant="outline" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Vollansicht
          </Button>
          
          <Button variant="outline" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Teilen
          </Button>
        </div>

        {generatingPdf && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>PDF wird generiert...</span>
              <span>Dies kann einige Minuten dauern</span>
            </div>
            <Progress className="w-full" />
          </div>
        )}

        <Separator />

        {/* Manual Content Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Inhaltsvorschau</h3>
          
          {/* Übersicht */}
          {manual.content?.content?.overview && (
            <Card className="bg-blue-50">
              <CardHeader>
                <h4 className="font-medium">Projekt-Übersicht</h4>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {typeof manual.content.content.overview === 'string' 
                    ? manual.content.content.overview.substring(0, 500) + '...'
                    : 'Übersicht verfügbar'
                  }
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sicherheitshinweise */}
          {manual.content?.content?.safetyNotice && (
            <Alert variant="destructive" className="bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Sicherheitshinweise</div>
                <div className="text-sm">
                  {typeof manual.content.content.safetyNotice === 'string'
                    ? manual.content.content.safetyNotice.substring(0, 300) + '...'
                    : 'Sicherheitshinweise verfügbar'
                  }
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Hauptinhalt */}
          <Card>
            <CardHeader>
              <h4 className="font-medium">Bauanleitung (Auszug)</h4>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full">
                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {manual.content?.content?.instructions
                    ? (typeof manual.content.content.instructions === 'string'
                        ? manual.content.content.instructions.substring(0, 2000)
                        : JSON.stringify(manual.content.content.instructions, null, 2).substring(0, 2000)
                      ) + '\n\n... (Vollständiger Inhalt in der PDF verfügbar)'
                    : 'Anleitung wird verarbeitet...'
                  }
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quellen */}
          {manual.content?.sources && manual.content.sources.length > 0 && (
            <Card className="bg-gray-50">
              <CardHeader>
                <h4 className="font-medium">Verwendete Quellen</h4>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {manual.content.sources.slice(0, 3).map((source, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-medium">{source.name}</div>
                      <div className="text-gray-600">{source.manufacturer}</div>
                    </div>
                  ))}
                  {manual.content.sources.length > 3 && (
                    <div className="text-sm text-gray-500">
                      ... und {manual.content.sources.length - 3} weitere Quellen
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Legal Notice */}
        <Alert className="bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">Rechtlicher Hinweis</div>
            <div className="text-sm">
              Diese Anleitung wurde mittels KI aus verschiedenen Quellen zusammengestellt und 
              dient nur als Hilfestellung. Konsultieren Sie bei Problemen immer die 
              Original-Handbücher der Hersteller. Nutzung auf eigene Gefahr.
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default AIManualPreview;