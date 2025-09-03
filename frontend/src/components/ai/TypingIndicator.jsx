import React from 'react';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TypingIndicator = ({ message }) => {
  const { t } = useTranslation();
  const displayMessage = message || t('aiChat.thinking', 'Denke nach...');
  return (
    <div className="flex justify-start space-x-2">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        <Bot size={16} className="text-blue-600" />
      </div>

      {/* Typing Animation */}
      <div className="max-w-[80%]">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{displayMessage}</span>
            
            {/* Animated Dots */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                   style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                   style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                   style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>

          {/* Subtle pulsing background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg opacity-30 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;