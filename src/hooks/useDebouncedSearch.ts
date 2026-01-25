import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';

export interface UseDebouncedSearchReturn {
  query: string;
  debouncedQuery: string;
  setQuery: (query: string) => void;
  isSearching: boolean;
}

/**
 * Hook for debounced search functionality
 */
export const useDebouncedSearch = (initialQuery = '', delay = 300): UseDebouncedSearchReturn => {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, delay);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(query !== debouncedQuery);
  }, [query, debouncedQuery]);

  return {
    query,
    debouncedQuery,
    setQuery,
    isSearching,
  };
};

export default useDebouncedSearch;
