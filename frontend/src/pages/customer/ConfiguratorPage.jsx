import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfiguratorContext } from '../../contexts/ConfiguratorContext';
import Configurator from '../../components/customer/Configurator';
import CostPanel from '../../components/customer/CostPanel';
import GuidesCompiler from '../../components/customer/GuidesCompiler';
import { ChatAdvisor, CompositionAssistant } from '../../components/ai';
import { Sparkles, Wand2 } from 'lucide-react';
import useProductTranslation from '../../hooks/useProductTranslation';

function ConfiguratorPage() {
  const { t } = useTranslation(['translation', 'products']);
  const { translateProduct } = useProductTranslation();
  const { items, addItem, updateTotalCost } = useContext(ConfiguratorContext);
  
  // AI Features State
  const [showChatAdvisor, setShowChatAdvisor] = useState(false);
  const [showCompositionAssistant, setShowCompositionAssistant] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  // AI Integration Handlers
  const handleConfigurationGenerated = (configuration) => {
    if (configuration?.components) {
      configuration.components.forEach(component => {
        const item = {
          id: `ai-${component.category}-${Date.now()}`,
          category: component.category,
          name: component.item,
          price: component.price,
          quantity: component.quantity || 1,
          description: component.reason || '',
          specifications: {
            aiGenerated: true,
            originalConfig: configuration.configuration?.name
          }
        };
        
        addItem(item);
      });
      
      // Update total cost
      const totalCost = configuration.components.reduce((sum, comp) => 
        sum + (comp.price * (comp.quantity || 1)), 0
      );
      updateTotalCost(totalCost);
    }
    
    setShowCompositionAssistant(false);
  };

  const handleComponentAdd = (componentSuggestion) => {
    // Parse AI suggestions and add to configuration
    // This would need more sophisticated parsing logic
    setAiSuggestions(prev => [...prev, componentSuggestion]);
  };

  const handleChatFeedback = (messageId, feedbackType) => {
    // Send feedback to backend for AI improvement
    console.log('AI Feedback:', messageId, feedbackType);
  };

  return (
    <>
      <main className="max-w-6xl mx-auto px-6 pb-24">
        {/* AI Features Toggle Bar */}
        <div className="mb-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                <span>KI-Assistenten</span>
              </h2>
              <p className="text-sm text-slate-300">
                Lass dir von der KI bei der Komponentenauswahl und Konfiguration helfen
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCompositionAssistant(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <Wand2 size={16} />
                <span>Automatische Konfiguration</span>
              </button>
              
              <button
                onClick={() => setShowChatAdvisor(!showChatAdvisor)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  showChatAdvisor
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
                }`}
              >
                <span>Chat-Berater</span>
                {showChatAdvisor && <span className="bg-blue-400 text-white text-xs px-2 py-0.5 rounded-full">AN</span>}
              </button>
            </div>
          </div>

          {/* AI Suggestions Display */}
          {aiSuggestions.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-300 mb-2">
                KI-Vorschläge für deine Konfiguration:
              </h3>
              <div className="space-y-1">
                {aiSuggestions.slice(-3).map((suggestion, index) => (
                  <p key={index} className="text-xs text-yellow-200">
                    • {suggestion.slice(0, 100)}...
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Configurator />
          <CostPanel />
          <div className="md:col-span-2">
            <GuidesCompiler items={items} />
          </div>
        </div>
      </main>

      {/* AI Chat Advisor */}
      {showChatAdvisor && (
        <ChatAdvisor
          currentConfiguration={{ items }}
          onConfigurationUpdate={handleConfigurationGenerated}
          isMinimized={false}
          onToggleMinimize={() => setShowChatAdvisor(false)}
          onComponentAdd={handleComponentAdd}
          onFeedback={handleChatFeedback}
        />
      )}

      {/* AI Composition Assistant Modal */}
      {showCompositionAssistant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CompositionAssistant
              onConfigurationGenerated={handleConfigurationGenerated}
              onClose={() => setShowCompositionAssistant(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default ConfiguratorPage;