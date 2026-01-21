import { useState, useCallback } from 'react';

/**
 * Hook for optimistic UI updates
 * Immediately updates UI before backend confirmation
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  onServerUpdate: (data: T) => Promise<void>
) {
  const [data, setData] = useState<T>(initialData);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (updater: (prev: T) => T) => {
      // Store previous state for rollback
      const previousData = data;

      try {
        // Optimistic update (immediate)
        setIsOptimistic(true);
        const newData = updater(data);
        setData(newData);

        // Server update (async)
        await onServerUpdate(newData);

        // Success - clear optimistic flag
        setIsOptimistic(false);
        setError(null);
      } catch (err) {
        // Rollback on error
        setData(previousData);
        setIsOptimistic(false);
        setError(err as Error);
        throw err;
      }
    },
    [data, onServerUpdate]
  );

  return {
    data,
    isOptimistic,
    error,
    update,
    setData
  };
}

/**
 * Hook for optimistic toggle (checkbox, switch, etc.)
 */
export function useOptimisticToggle(
  initialValue: boolean,
  onServerToggle: (value: boolean) => Promise<void>
) {
  const [value, setValue] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);

  const toggle = useCallback(async () => {
    const previousValue = value;
    const newValue = !value;

    try {
      // Optimistic update
      setValue(newValue);
      setIsPending(true);

      // Server update
      await onServerToggle(newValue);

      setIsPending(false);
    } catch (err) {
      // Rollback
      setValue(previousValue);
      setIsPending(false);
      throw err;
    }
  }, [value, onServerToggle]);

  return {
    value,
    isPending,
    toggle,
    setValue
  };
}

/**
 * Hook for optimistic list operations
 */
export function useOptimisticList<T extends { id: string | number }>(
  initialList: T[],
  onServerUpdate: (list: T[]) => Promise<void>
) {
  const [list, setList] = useState<T[]>(initialList);
  const [pendingIds, setPendingIds] = useState<Set<string | number>>(new Set());

  const add = useCallback(
    async (item: T) => {
      try {
        // Optimistic add
        setList((prev) => [...prev, item]);
        setPendingIds((prev) => new Set(prev).add(item.id));

        // Server update
        const newList = [...list, item];
        await onServerUpdate(newList);

        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      } catch (err) {
        // Rollback
        setList((prev) => prev.filter((i) => i.id !== item.id));
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        throw err;
      }
    },
    [list, onServerUpdate]
  );

  const remove = useCallback(
    async (id: string | number) => {
      const itemToRemove = list.find((i) => i.id === id);
      if (!itemToRemove) return;

      try {
        // Optimistic remove
        setList((prev) => prev.filter((i) => i.id !== id));
        setPendingIds((prev) => new Set(prev).add(id));

        // Server update
        const newList = list.filter((i) => i.id !== id);
        await onServerUpdate(newList);

        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        // Rollback
        setList((prev) => [...prev, itemToRemove]);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        throw err;
      }
    },
    [list, onServerUpdate]
  );

  const update = useCallback(
    async (id: string | number, updater: (item: T) => T) => {
      const itemToUpdate = list.find((i) => i.id === id);
      if (!itemToUpdate) return;

      const previousItem = { ...itemToUpdate };

      try {
        // Optimistic update
        setList((prev) =>
          prev.map((i) => (i.id === id ? updater(i) : i))
        );
        setPendingIds((prev) => new Set(prev).add(id));

        // Server update
        const newList = list.map((i) => (i.id === id ? updater(i) : i));
        await onServerUpdate(newList);

        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        // Rollback
        setList((prev) =>
          prev.map((i) => (i.id === id ? previousItem : i))
        );
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        throw err;
      }
    },
    [list, onServerUpdate]
  );

  return {
    list,
    pendingIds,
    add,
    remove,
    update,
    isPending: (id: string | number) => pendingIds.has(id)
  };
}

export default useOptimisticUpdate;
