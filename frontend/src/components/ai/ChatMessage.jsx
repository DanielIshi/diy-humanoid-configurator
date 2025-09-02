import React, { useState } from 'react';
import { Bot, User, Copy, ThumbsUp, ThumbsDown, AlertTriangle, Clock, CheckCircle, ExternalLink, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const ChatMessage = ({ message, onComponentAdd = null, onFeedback = null }) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const { role, content, timestamp, metadata, isError } = message;
  const isUser = role === 'user';
  const isSystem = role === 'system';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleFeedback = (type) => {
    setFeedback(type);
    if (onFeedback) {
      onFeedback(message.id, type);
    }
  };

  // Komponenten-Links im Text erkennen und klickbar machen
  const renderContentWithLinks = (text) => {
    // Pattern für Komponenten-Erwähnungen
    const componentPattern = /(Arduino|Raspberry Pi|ESP32|Servo|Sensor|Motor|Kamera)([^.!?]*)/gi;
    
    return text.split('\n').map((line, lineIndex) => (
      <p key={lineIndex} className="mb-2 last:mb-0">
        {line.split(componentPattern).map((part, partIndex) => {
          if (componentPattern.test(part)) {
            return (
              <span
                key={partIndex}
                className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                onClick={() => onComponentAdd && onComponentAdd(part)}
                title="Zur Konfiguration hinzufügen"
              >
                {part}
              </span>
            );
          }
          return part;
        })}
      </p>
    ));
  };

  // Preisschätzungen hervorheben
  const renderContentWithPrices = (text) => {
    const pricePattern = /(\d+[,.]?\d*\s*€|\$\s*\d+[,.]?\d*)/g;
    
    return text.replace(pricePattern, (match) => 
      `<span class="bg-green-100 text-green-800 px-1 rounded font-semibold">${match}</span>`
    );
  };

  // Strukturierte Listen erkennen
  const isListContent = content.includes('- ') || content.includes('• ') || /^\d+\./.test(content);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} space-x-2`}>
      {/* Avatar */}
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isSystem 
            ? 'bg-yellow-100' 
            : isError 
              ? 'bg-red-100' 
              : 'bg-blue-100'
        }`}>
          {isSystem ? (
            <AlertTriangle size={16} className="text-yellow-600" />
          ) : isError ? (
            <AlertTriangle size={16} className="text-red-600" />
          ) : (
            <Bot size={16} className="text-blue-600" />
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div className={`relative px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-blue-600 text-white ml-12' 
            : isError
              ? 'bg-red-50 border border-red-200'
              : isSystem
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-gray-50 border border-gray-200'
        }`}>
          {/* Metadata Header */}
          {metadata && (
            <div className="text-xs opacity-70 mb-2 flex items-center space-x-2">
              <span>via {metadata.provider}</span>
              <span>•</span>
              <span>{metadata.tokens} tokens</span>
              {metadata.provider === 'openrouter' && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                  kostenlos
                </span>
              )}
            </div>
          )}

          {/* Message Content */}
          <div className={`text-sm ${
            isUser ? 'text-white' : isError ? 'text-red-800' : 'text-gray-800'
          }`}>
            {isListContent ? (
              <div className="space-y-1">
                {content.split('\n').map((line, index) => (
                  line.trim() && (
                    <div key={index} className="flex items-start space-x-2">
                      {line.startsWith('- ') || line.startsWith('• ') ? (
                        <>
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{line.substring(2)}</span>
                        </>
                      ) : /^\d+\./.test(line) ? (
                        <span className="font-medium">{line}</span>
                      ) : (
                        <span>{line}</span>
                      )}
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: renderContentWithPrices(content.replace(/\n/g, '<br>'))
                }}
              />
            )}
          </div>

          {/* Action Buttons */}
          {!isUser && !isSystem && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Kopieren"
                >
                  {copied ? (
                    <CheckCircle size={14} className="text-green-600" />
                  ) : (
                    <Copy size={14} className="text-gray-500" />
                  )}
                </button>

                {content.includes('empfehle') && onComponentAdd && (
                  <button
                    onClick={() => onComponentAdd(content)}
                    className="p-1 hover:bg-blue-100 rounded transition-colors text-blue-600"
                    title="Empfohlene Komponenten hinzufügen"
                  >
                    <ShoppingCart size={14} />
                  </button>
                )}
              </div>

              {/* Feedback Buttons */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleFeedback('helpful')}
                  className={`p-1 rounded transition-colors ${
                    feedback === 'helpful' 
                      ? 'bg-green-100 text-green-600' 
                      : 'hover:bg-gray-200 text-gray-500'
                  }`}
                  title="Hilfreich"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  onClick={() => handleFeedback('not-helpful')}
                  className={`p-1 rounded transition-colors ${
                    feedback === 'not-helpful' 
                      ? 'bg-red-100 text-red-600' 
                      : 'hover:bg-gray-200 text-gray-500'
                  }`}
                  title="Nicht hilfreich"
                >
                  <ThumbsDown size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          <Clock size={12} className="inline mr-1" />
          {format(new Date(timestamp), 'HH:mm', { locale: de })}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
          <User size={16} className="text-gray-600" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;