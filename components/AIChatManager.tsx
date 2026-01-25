import React from 'react';
import { AppData } from '../types';
import { validateChatMessage } from '../utils/inputValidation';

interface AIChatManagerProps {
  data: AppData;
  onSendMessage: (message: string) => Promise<void>;
}

/**
 * AI Chat management component handling message validation and processing
 */
export const AIChatManager: React.FC<AIChatManagerProps> = ({ data, onSendMessage }) => {
  const handleSendAICoachMessage = async (message: string) => {
    // Validate user input
    const validation = validateChatMessage(message);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid message');
    }

    // Rate limiting is handled in the input validation utility
    const sanitizedMessage = validation.sanitized;

    // Call the parent's onSendMessage with sanitized input
    await onSendMessage(sanitizedMessage);
  };

  // This component doesn't render anything visible - it just provides handlers
  return null;
};
