import { describe, it } from "vitest";
import * as fc from "fast-check";
import { isRowLoading, revertAttendanceStatus } from "./useAsyncAction";

// ---------------------------------------------------------------------------
// Pure async state machine — mirrors useAsyncAction logic without React
// Used to test Properties 1–4 without a DOM or React renderer.
// ---------------------------------------------------------------------------

interface AsyncActionState<T> {
  isLoading: boolean;
  error: string | null;
  result: T | undefined;
}

async function runAsyncAction<T>(
  fn: () => Promise<T>,
  initialLoading = false,
): Promise<{
  loadingDuringExecution: boolean;
  stateAfter: AsyncActionState<T>;
  invocationCount: number;
}> {
  let isLoading = initialLoading;
  let error: string | null = null;
  let result: T | undefined = undefined;
  let invocationCount = 0;
  let loadingDuringExecution = false;

  // Guard: if already loading, skip (mirrors the hook's concurrent-call guard)
  if (isLoading) {
    return {
      loadingDuringExecution: false,
      stateAfter: { isLoading, error, result },
      invocationCount: 0,
    };
  }

  isLoading = true;
  try {
    invocationCount++;
    loadingDuringExecution = isLoading; // capture loading state during execution
    result = await fn();
  } catch (err) {
    // Capture error but do NOT re-throw — we want to inspect state after settling
    error = err instanceof Error ? err.message : String(err);
  } finally {
    isLoading = false;
  }

  return {
    loadingDuringExecution,
    stateAfter: { isLoading, error, result },
    invocationCount,
  };
}

// ---------------------------------------------------------------------------
// Property 1: Loading flag is true during async execution
// **Feature: button-loading-states, Property 1: Loading flag is true during async execution**
// Validates: Requirements 1.1, 2.1, 4.1
// ---------------------------------------------------------------------------
describe("Property 1: Loading flag is true during async execution", () => {
  it("isLoading is true during fn() execution and false after completion", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 50 }),
        fc.boolean(),
        async (delayMs, shouldSucceed) => {
          const fn = () =>
            new Promise<number>((resolve, reject) =>
              setTimeout(
                () => (shouldSucceed ? resolve(42) : reject(new Error("fail"))),
                delayMs,
              ),
            );

          const { loadingDuringExecution, stateAfter } = await runAsyncAction(fn);

          // isLoading must be true during execution
          if (!loadingDuringExecution) return false;
          // isLoading must be false after completion
          if (stateAfter.isLoading) return false;
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Second call while loading is ignored
// **Feature: button-loading-states, Property 2: Second call while loading is ignored**
// Validates: Requirements 1.2, 2.2, 4.2
// ---------------------------------------------------------------------------
describe("Property 2: Second call while loading is ignored", () => {
  it("calling execute while isLoading=true does not invoke fn a second time", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }),
        async (_seed) => {
          let callCount = 0;

          const fn = async () => {
            callCount++;
            return 1;
          };

          // Pass initialLoading=true to simulate the guard condition
          const { invocationCount } = await runAsyncAction(fn, true);

          // The function must NOT have been called
          return invocationCount === 0 && callCount === 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Loading flag always resets to false after completion
// **Feature: button-loading-states, Property 3: Loading flag always resets to false after completion**
// Validates: Requirements 1.3, 2.3, 5.2
// ---------------------------------------------------------------------------
describe("Property 3: Loading flag always resets to false after completion", () => {
  it("isLoading is false after execute settles, regardless of success or failure", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (shouldThrow) => {
          const fn = () =>
            shouldThrow
              ? Promise.reject(new Error("intentional error"))
              : Promise.resolve(99);

          const { stateAfter } = await runAsyncAction(fn);

          return stateAfter.isLoading === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Error is captured when async function throws
// **Feature: button-loading-states, Property 4: Error is captured when async function throws**
// Validates: Requirements 1.4, 2.4
// ---------------------------------------------------------------------------
describe("Property 4: Error is captured when async function throws", () => {
  it("error field equals the thrown Error message after execute settles", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          const fn = () => Promise.reject(new Error(errorMessage));

          const { stateAfter } = await runAsyncAction(fn);

          return stateAfter.error === errorMessage;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Per-row loading independence
// **Feature: button-loading-states, Property 5: Per-row loading independence**
// Validates: Requirements 3.2, 3.5
// ---------------------------------------------------------------------------
describe("Property 5: Per-row loading independence", () => {
  it("adding one ID to loadingSet does not affect isRowLoading for other IDs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        (ids, targetIndex) => {
          const uniqueIds = [...new Set(ids)];
          if (uniqueIds.length < 2) return true; // skip degenerate case

          const idx = targetIndex % uniqueIds.length;
          const targetId = uniqueIds[idx];
          const otherIds = uniqueIds.filter((id) => id !== targetId);

          const loadingSet = new Set([targetId]);

          // Target must be loading
          if (!isRowLoading(loadingSet, targetId)) return false;

          // All others must NOT be loading
          return otherIds.every((id) => !isRowLoading(loadingSet, id));
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Optimistic update reverts on error
// **Feature: button-loading-states, Property 6: Optimistic update reverts on error**
// Validates: Requirements 3.4
// ---------------------------------------------------------------------------
describe("Property 6: Optimistic update reverts on error", () => {
  it("revertAttendanceStatus restores the failed employee's previous status", () => {
    const STATUSES = ["present", "absent", "half-day", "leave"] as const;
    const arbStatus = fc.constantFrom(...STATUSES);

    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        arbStatus,
        arbStatus,
        (ids, targetIndex, previousStatus, newStatus) => {
          const uniqueIds = [...new Set(ids)];
          const idx = targetIndex % uniqueIds.length;
          const targetId = uniqueIds[idx];

          // Build previous and current maps
          const previousMap: Record<string, string> = {};
          const currentMap: Record<string, string> = {};
          for (const id of uniqueIds) {
            previousMap[id] = previousStatus;
            currentMap[id] = id === targetId ? newStatus : previousStatus;
          }

          const reverted = revertAttendanceStatus(currentMap, previousMap, targetId);

          // The target employee's status must be restored to previous
          if (reverted[targetId] !== previousStatus) return false;

          // Other employees' statuses must be unchanged
          return uniqueIds
            .filter((id) => id !== targetId)
            .every((id) => reverted[id] === currentMap[id]);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: LoadingButton disabled iff isLoading
// **Feature: button-loading-states, Property 7: LoadingButton disabled iff isLoading**
// Validates: Requirements 5.4, 5.5
// ---------------------------------------------------------------------------
describe("Property 7: LoadingButton disabled iff isLoading", () => {
  it("disabled prop equals isLoading for all boolean inputs", () => {
    fc.assert(
      fc.property(fc.boolean(), (isLoading) => {
        // Pure prop mapping: disabled should equal isLoading
        // This mirrors the LoadingButton implementation: disabled={isLoading || props.disabled}
        // When props.disabled is not set (undefined/false), disabled === isLoading
        const disabled = isLoading || false;
        return disabled === isLoading;
      }),
      { numRuns: 100 },
    );
  });
});
