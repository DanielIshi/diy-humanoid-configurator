import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, User, Loader2, AlertCircle, Sparkles, Settings } from 'lucide-react';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';

const ChatAdvisor = ({ 
  currentConfiguration = null,
  onConfigurationUpdate = null,
  isMinimized = false,
  onToggleMinimize = null
}) => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hallo! Ich bin dein KI-Berater für DIY Humanoid Roboter. Ich kann dir bei der Auswahl von Komponenten, Kompatibilitätsprüfungen und Optimierungen helfen. Wie kann ich dir heute behilflich sein?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [budget, setBudget] = useState('');
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [showSettings, setShowSettings] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll zu neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus auf Input nach Minimierung
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMinimized]);

  const sendMessage = async (messageContent = null) => {
    const content = messageContent || inputMessage.trim();
    if (!content || isLoading) return;

    setError(null);
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Verwende Backend auf Port 3001 für lokale Entwicklung
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/ai/chat'
        : '/api/ai/chat';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: content,
          chatHistory: messages.slice(-10), // Letzte 10 Nachrichten als Context
          currentConfiguration,
          context: {
            budget: budget || null,
            skillLevel
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Senden der Nachricht');
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: data.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Komponenten-Empfehlungen extrahieren und an Parent weiterleiten
      if (onConfigurationUpdate && data.response.includes('empfehle')) {
        // Hier könnte intelligentes Parsing für Komponenten-Empfehlungen implementiert werden
      }

    } catch (error) {
      console.error('Chat Error:', error);
      setError(error.message);
      
      // Fehlernachricht als System-Message hinzufügen
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Fehler: ${error.message}. Bitte versuche es erneut oder kontaktiere den Support.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    {
      text: 'Hilf mir bei der Komponentenauswahl',
      action: () => sendMessage('Ich brauche Hilfe bei der Auswahl passender Komponenten für meinen Roboter.')
    },
    {
      text: 'Prüfe meine Konfiguration',
      action: () => sendMessage('Kannst du meine aktuelle Konfiguration überprüfen?')
    },
    {
      text: 'Optimiere mein Budget',
      action: () => sendMessage('Wie kann ich Kosten sparen ohne die Qualität zu beeinträchtigen?')
    },
    {
      text: 'Schwierigkeitsgrad einschätzen',
      action: () => sendMessage('Wie schwierig ist der Bau mit dieser Konfiguration?')
    }
  ];

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggleMinimize}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
        >
          <MessageCircle size={24} />
          {messages.length > 1 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {messages.length - 1}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bot size={24} />
            <Sparkles size={12} className="absolute -top-1 -right-1 text-yellow-300" />
          </div>
          <div>
            <h3 className="font-semibold">KI-Berater</h3>
            <p className="text-xs text-blue-100">Robotik-Experte</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Einstellungen"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={onToggleMinimize}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Minimieren"
          >
            ─
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Skill-Level
              </label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">Anfänger</option>
                <option value="intermediate">Fortgeschrittener</option>
                <option value="advanced">Experte</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Budget (€)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="z.B. 500"
                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isTyping && <TypingIndicator />}
        
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={16} className="text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Schnelle Aktionen:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                disabled={isLoading}
                className="text-xs text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors disabled:opacity-50"
              >
                {action.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Frage zu Roboter-Komponenten..."
              rows={1}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 text-sm"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            {inputMessage.length > 0 && (
              <div className="absolute bottom-1 right-8 text-xs text-gray-400">
                {inputMessage.length}/500
              </div>
            )}
          </div>
          
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Drücke Enter zum Senden, Shift+Enter für neue Zeile
        </p>
      </div>
    </div>
  );
};

export default ChatAdvisor;