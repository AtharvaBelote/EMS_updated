import { useState, useRef, useCallback } from "react";

export interface UseAsyncActionReturn<T> {
  execute: (fn: () => Promise<T>) => Promise<T | undefined>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Shared hook that encapsulates the pattern of:
 * - setting isLoading = true
 * - executing an async function
 * - setting isLoading = false in a finally block
 * - capturing any thrown error message
 *
 * Guards against concurrent calls: if isLoading is true, execute is a no-op.
 */
export function useAsyncAction<T = void>(): UseAsyncActionReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Use a ref so the guard check inside execute always sees the latest value
  const isLoadingRef = useRef(false);

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | undefined> => {
    if (isLoadingRef.current) return undefined;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fn();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { execute, isLoading, error, clearError };
}

/**
 * Returns true if the given employeeId is currently in the loading set.
 * Keeps per-row loading state independent.
 */
export function isRowLoading(loadingSet: Set<string>, employeeId: string): boolean {
  return loadingSet.has(employeeId);
}

/**
 * Pure helper: given a previous status map and a failed employee ID,
 * returns a new map with that employee's status restored to the previous value.
 */
export function revertAttendanceStatus(
  currentMap: Record<string, string>,
  previousMap: Record<string, string>,
  employeeId: string,
): Record<string, string> {
  return {
    ...currentMap,
    [employeeId]: previousMap[employeeId],
  };
}
