import React from 'react';

interface InAppNotificationManagerProps {
  onNavigateToFinish: () => void;
}

/**
 * Placeholder notification manager - temporarily disabled
 */
export const NotificationManager: React.FC<InAppNotificationManagerProps> = ({
  onNavigateToFinish,
}) => {
  // Temporarily disabled - no notifications shown
  return null;
};
