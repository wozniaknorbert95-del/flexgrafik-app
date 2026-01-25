import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

export interface KeyboardAwareViewProps {
  children: React.ReactNode;
  className?: string;
  offset?: number;
  animationDuration?: number;
  enableOnAndroid?: boolean;
  enableOnIOS?: boolean;
}

/**
 * Keyboard Aware View Component
 * Automatically adjusts layout when virtual keyboard appears
 */
export const KeyboardAwareView: React.FC<KeyboardAwareViewProps> = ({
  children,
  className = '',
  offset = 0,
  animationDuration = 300,
  enableOnAndroid = true,
  enableOnIOS = true,
}) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialHeightRef = useRef<number>(0);

  useEffect(() => {
    // Detect device type
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    const shouldEnable = (isIOS && enableOnIOS) || (isAndroid && enableOnAndroid);

    if (!shouldEnable) return;

    let resizeObserver: ResizeObserver | null = null;
    let visualViewport: VisualViewport | null = null;

    const handleKeyboardShow = () => {
      if (!visualViewport) return;

      const viewportHeight = window.innerHeight;
      const keyboardHeight = window.innerHeight - visualViewport.height;

      if (keyboardHeight > 150) {
        // Threshold to detect keyboard
        setKeyboardHeight(keyboardHeight + offset);
        setIsKeyboardVisible(true);
      }
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    // Use Visual Viewport API for modern browsers
    if (window.visualViewport) {
      visualViewport = window.visualViewport;
      visualViewport.addEventListener('resize', handleKeyboardShow);

      // Fallback for when viewport returns to normal
      const checkKeyboardHide = () => {
        if (visualViewport && visualViewport.height >= window.innerHeight - 50) {
          handleKeyboardHide();
        }
      };

      const hideTimeout = setTimeout(checkKeyboardHide, 100);
      return () => clearTimeout(hideTimeout);
    }

    // Fallback for older browsers using window resize
    const handleWindowResize = () => {
      if (!initialHeightRef.current) {
        initialHeightRef.current = window.innerHeight;
        return;
      }

      const heightDiff = initialHeightRef.current - window.innerHeight;

      if (heightDiff > 150) {
        // Keyboard appeared
        setKeyboardHeight(heightDiff + offset);
        setIsKeyboardVisible(true);
      } else if (heightDiff < 50) {
        // Keyboard hidden
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    };

    window.addEventListener('resize', handleWindowResize);

    // Cleanup
    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleKeyboardShow);
      }
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [offset, enableOnAndroid, enableOnIOS]);

  // Scroll focused input into view when keyboard appears
  useEffect(() => {
    if (isKeyboardVisible && containerRef.current) {
      const focusedElement = document.activeElement as HTMLElement;
      if (focusedElement && containerRef.current.contains(focusedElement)) {
        setTimeout(() => {
          focusedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }, 100);
      }
    }
  }, [isKeyboardVisible]);

  return (
    <motion.div
      ref={containerRef}
      className={`keyboard-aware ${className}`}
      style={{
        paddingBottom: keyboardHeight,
        transition: `padding-bottom ${animationDuration}ms ease-out`,
      }}
      animate={{
        paddingBottom: keyboardHeight,
      }}
      transition={{
        duration: animationDuration / 1000,
        ease: 'easeOut',
      }}
    >
      {children}

      {/* Visual indicator for keyboard state (dev mode) */}
      {process.env.NODE_ENV === 'development' && isKeyboardVisible && (
        <div className="fixed top-4 right-4 bg-cyan-500 text-white px-3 py-1 rounded text-xs z-50">
          Keyboard: {keyboardHeight}px
        </div>
      )}
    </motion.div>
  );
};

// Hook for keyboard awareness in functional components
export const useKeyboardAware = (offset = 0) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (!isIOS && !isAndroid) return;

    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.innerHeight;
        const keyboardHeight = window.innerHeight - window.visualViewport.height;

        if (keyboardHeight > 150) {
          setKeyboardHeight(keyboardHeight + offset);
          setIsKeyboardVisible(true);
        } else {
          setKeyboardHeight(0);
          setIsKeyboardVisible(false);
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, [offset]);

  return { keyboardHeight, isKeyboardVisible };
};

export default KeyboardAwareView;
