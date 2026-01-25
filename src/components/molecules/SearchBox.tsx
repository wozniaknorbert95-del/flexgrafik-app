import React, { useState, useCallback, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Icon } from '../atoms';
import { BaseComponentProps, LoadingProps, AccessibilityProps } from '../../types/components';

// SearchBox specific props
export interface SearchBoxProps extends BaseComponentProps, LoadingProps, AccessibilityProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onSearch?: (query: string) => void;
  onChange?: (query: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  showClearButton?: boolean;
  autoFocus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * SearchBox Molecule Component
 * Combines Input and Button atoms for search functionality with debouncing
 */
export const SearchBox = forwardRef<HTMLDivElement, SearchBoxProps>(
  (
    {
      placeholder = 'Search...',
      value,
      defaultValue,
      onSearch,
      onChange,
      onClear,
      debounceMs = 300,
      showClearButton = true,
      autoFocus = false,
      isLoading = false,
      size = 'md',
      className = '',
      'aria-label': ariaLabel = 'Search',
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    // Use controlled or uncontrolled value
    const currentValue = value !== undefined ? value : internalValue;

    // Debounced search handler
    const debouncedSearch = useCallback(
      (query: string) => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        const timer = setTimeout(() => {
          onSearch?.(query);
        }, debounceMs);

        setDebounceTimer(timer);
      },
      [debounceMs, onSearch, debounceTimer]
    );

    // Handle input change
    const handleChange = (newValue: string) => {
      // Update internal state if uncontrolled
      if (value === undefined) {
        setInternalValue(newValue);
      }

      // Call onChange immediately
      onChange?.(newValue);

      // Debounce search
      if (newValue.trim()) {
        debouncedSearch(newValue);
      }
    };

    // Handle search button click
    const handleSearch = () => {
      if (currentValue.trim()) {
        onSearch?.(currentValue);
      }
    };

    // Handle clear
    const handleClear = () => {
      if (value === undefined) {
        setInternalValue('');
      }
      onClear?.();
      onChange?.('');
    };

    // Handle key press
    const handleKeyPress = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSearch();
      } else if (event.key === 'Escape' && showClearButton) {
        handleClear();
      }
    };

    return (
      <motion.div
        ref={ref}
        className={`flex gap-2 ${className}`}
        data-testid={testId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search Input */}
        <div className="flex-1 relative">
          <Input
            type="search"
            placeholder={placeholder}
            value={currentValue}
            onValueChange={handleChange}
            onKeyDown={handleKeyPress}
            leftIcon={<Icon name="search" size="sm" />}
            size={size}
            autoFocus={autoFocus}
            isLoading={isLoading}
            aria-label={ariaLabel}
            className="pr-10"
          />

          {/* Clear button overlay */}
          {showClearButton && currentValue && (
            <motion.button
              onClick={handleClear}
              className="
              absolute right-3 top-1/2 -translate-y-1/2
              flex items-center justify-center
              w-5 h-5 rounded-full
              bg-gray-600/50 hover:bg-gray-500/70
              text-gray-400 hover:text-white
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-cyan-400
            "
              aria-label="Clear search"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Icon name="close" size="xs" />
            </motion.button>
          )}
        </div>

        {/* Search Button */}
        <Button
          variant="primary"
          size={size}
          onClick={handleSearch}
          disabled={!currentValue.trim() || isLoading}
          isLoading={isLoading}
          loadingText="Searching..."
          aria-label="Perform search"
        >
          <Icon name="search" size="sm" />
          <span className="hidden sm:inline ml-2">Search</span>
        </Button>
      </motion.div>
    );
  }
);

SearchBox.displayName = 'SearchBox';

// Default props
SearchBox.defaultProps = {
  placeholder: 'Search...',
  debounceMs: 300,
  showClearButton: true,
  autoFocus: false,
  size: 'md',
};

export default SearchBox;
