import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { announceToScreenReader } from '../hooks/useAccessibility';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface InstallPromptProps {
  onInstall?: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ onInstall }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    checkInstalled();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(event);

      // Show our custom install prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
        announceToScreenReader('App installation available. Press Install to add to home screen.');
      }, 3000); // Show after 3 seconds
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      announceToScreenReader('App installed successfully!');
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Also check for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', checkInstalled);
    };
  }, [onInstall]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;

    // Reset the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);

    if (choiceResult.outcome === 'accepted') {
      announceToScreenReader('Installation accepted. App will be installed.');
      onInstall?.();
    } else {
      announceToScreenReader('Installation dismissed.');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    announceToScreenReader('Installation prompt dismissed.');
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !deferredPrompt || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-4 md:w-96"
      >
        <div className="glass-card p-4 shadow-2xl border-2 border-neon-cyan/50">
          <div className="flex items-start gap-3">
            <div className="text-3xl flex-shrink-0">📱</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">Install Mission Control</h3>
              <p className="text-sm text-gray-300 mb-4">
                Add to your home screen for the full app experience with offline access and push
                notifications.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-gradient-to-r from-neon-cyan to-cyan-500 text-black font-bold py-2 px-4 rounded-lg hover:shadow-lg transition-all"
                  aria-label="Install app to home screen"
                >
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Dismiss install prompt"
                >
                  Not Now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              aria-label="Close install prompt"
            >
              ✕
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook to manage install prompt state
export const useInstallPrompt = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    checkInstallStatus();

    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstallStatus);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', checkInstallStatus);
    };
  }, []);

  return { isInstalled, canInstall };
};
