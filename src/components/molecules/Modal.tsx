import React, { useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { Button, Icon } from '../atoms';
import { BaseComponentProps, AccessibilityProps, FocusProps } from '../../types/components';

// Modal compound component context
interface ModalContextType {
  isOpen: boolean;
  onClose: () => void;
  size: ModalSize;
  variant: ModalVariant;
}

const ModalContext = createContext<ModalContextType | null>(null);

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ModalVariant = 'default' | 'confirmation' | 'warning' | 'success' | 'error';

// Modal root props
interface ModalProps extends BaseComponentProps, AccessibilityProps, FocusProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  variant?: ModalVariant;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  children: React.ReactNode;
}

/**
 * Modal Compound Component
 * Uses compound component pattern for flexible modal composition
 *
 * Usage:
 * <Modal isOpen={isOpen} onClose={onClose}>
 *   <Modal.Header title="My Modal" />
 *   <Modal.Body>
 *     <p>Modal content</p>
 *   </Modal.Body>
 *   <Modal.Footer>
 *     <Modal.CancelButton />
 *     <Modal.ConfirmButton />
 *   </Modal.Footer>
 * </Modal>
 */
export const Modal: React.FC<ModalProps> & {
  Header: React.FC<ModalHeaderProps>;
  Body: React.FC<ModalBodyProps>;
  Footer: React.FC<ModalFooterProps>;
  CancelButton: React.FC<ModalButtonProps>;
  ConfirmButton: React.FC<ModalButtonProps>;
} = ({
  isOpen,
  onClose,
  size = 'md',
  variant = 'default',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  preventScroll = true,
  children,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'data-testid': testId,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (preventScroll && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, preventScroll]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Size configurations
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  // Variant configurations
  const variantClasses = {
    default: 'bg-gray-900/95 border-white/20',
    confirmation: 'bg-blue-900/95 border-blue-500/30',
    warning: 'bg-yellow-900/95 border-yellow-500/30',
    success: 'bg-green-900/95 border-green-500/30',
    error: 'bg-red-900/95 border-red-500/30',
  };

  const contextValue: ModalContextType = {
    isOpen,
    onClose,
    size,
    variant,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            data-testid={testId}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal content */}
            <motion.div
              ref={modalRef}
              className={`
                relative w-full ${sizeClasses[size]}
                rounded-2xl border backdrop-blur-xl shadow-2xl
                ${variantClasses[variant]}
                ${className}
              `}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};

// Modal Header Component
interface ModalHeaderProps extends BaseComponentProps {
  title: string;
  subtitle?: string;
  showCloseButton?: boolean;
  icon?: string;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  showCloseButton = true,
  icon,
  className = '',
  'data-testid': testId,
}) => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('ModalHeader must be used within a Modal');

  const { onClose } = context;

  return (
    <div
      className={`flex items-start justify-between p-6 border-b border-white/10 ${className}`}
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        {icon && <Icon name={icon} size="lg" variant="primary" />}
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>

      {showCloseButton && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="p-1"
          aria-label="Close modal"
        >
          <Icon name="close" size="sm" />
        </Button>
      )}
    </div>
  );
};

// Modal Body Component
interface ModalBodyProps extends BaseComponentProps {
  children: React.ReactNode;
}

const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className = '',
  'data-testid': testId,
}) => {
  return (
    <div className={`p-6 ${className}`} data-testid={testId}>
      {children}
    </div>
  );
};

// Modal Footer Component
interface ModalFooterProps extends BaseComponentProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
}

const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  align = 'right',
  className = '',
  'data-testid': testId,
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={`flex items-center gap-3 p-6 border-t border-white/10 ${alignClasses[align]} ${className}`}
      data-testid={testId}
    >
      {children}
    </div>
  );
};

// Modal Button Components
interface ModalButtonProps extends Omit<React.ComponentProps<typeof Button>, 'children'> {
  children: React.ReactNode;
}

const ModalCancelButton: React.FC<ModalButtonProps> = ({ children, ...props }) => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('ModalCancelButton must be used within a Modal');

  const { onClose } = context;

  return (
    <Button variant="secondary" onClick={onClose} {...props}>
      {children}
    </Button>
  );
};

const ModalConfirmButton: React.FC<ModalButtonProps> = ({
  children,
  variant = 'primary',
  ...props
}) => {
  return (
    <Button variant={variant} {...props}>
      {children}
    </Button>
  );
};

// Attach sub-components to Modal
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.CancelButton = ModalCancelButton;
Modal.ConfirmButton = ModalConfirmButton;

// Preset modal variants for common use cases
export const ModalVariants = {
  Confirmation: (props: Omit<ModalProps, 'variant'>) => <Modal {...props} variant="confirmation" />,

  Warning: (props: Omit<ModalProps, 'variant'>) => <Modal {...props} variant="warning" />,

  Success: (props: Omit<ModalProps, 'variant'>) => <Modal {...props} variant="success" />,

  Error: (props: Omit<ModalProps, 'variant'>) => <Modal {...props} variant="error" />,
};

export default Modal;
