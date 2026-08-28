import { useState, useCallback, useRef } from 'react';

/**
 * Multi-Level Undo/Redo State History Hook
 *
 * @param {any} initialState - The starting state
 * @param {string} initialLabel - Human-readable label for the initial state
 * @param {number} maxHistory - Maximum number of history snapshots (default 50)
 */
export function useHistoryStack(initialState, initialLabel = 'Initial State', maxHistory = 50) {
  const [history, setHistory] = useState([
    {
      state: initialState,
      label: initialLabel,
      timestamp: Date.now(),
    },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Ref to prevent race conditions during rapid state pushes
  const historyRef = useRef(history);
  historyRef.current = history;
  const indexRef = useRef(currentIndex);
  indexRef.current = currentIndex;

  const currentState = history[currentIndex]?.state ?? initialState;
  const currentLabel = history[currentIndex]?.label ?? initialLabel;

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  /**
   * Push a new state snapshot to the history stack.
   * If current pointer is not at the tip, truncates any forward redo history.
   */
  const pushState = useCallback((newState, label = 'Action') => {
    // Avoid duplicate pushes if state is identical to current
    const prev = historyRef.current[indexRef.current]?.state;
    if (JSON.stringify(prev) === JSON.stringify(newState)) {
      return;
    }

    const nextHistory = historyRef.current.slice(0, indexRef.current + 1);
    const newEntry = {
      state: newState,
      label,
      timestamp: Date.now(),
    };

    let updated = [...nextHistory, newEntry];
    if (updated.length > maxHistory) {
      updated = updated.slice(updated.length - maxHistory);
    }

    setHistory(updated);
    setCurrentIndex(updated.length - 1);
  }, [maxHistory]);

  /**
   * Undo to the previous state.
   */
  const undo = useCallback(() => {
    if (indexRef.current > 0) {
      const nextIndex = indexRef.current - 1;
      setCurrentIndex(nextIndex);
      return historyRef.current[nextIndex]?.state;
    }
    return null;
  }, []);

  /**
   * Redo to the next state.
   */
  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      const nextIndex = indexRef.current + 1;
      setCurrentIndex(nextIndex);
      return historyRef.current[nextIndex]?.state;
    }
    return null;
  }, []);

  /**
   * Jump directly to a specific history snapshot index.
   */
  const jumpTo = useCallback((index) => {
    if (index >= 0 && index < historyRef.current.length) {
      setCurrentIndex(index);
      return historyRef.current[index]?.state;
    }
    return null;
  }, []);

  /**
   * Reset the entire history stack.
   */
  const resetHistory = useCallback((newState, label = 'Reset') => {
    const entry = {
      state: newState,
      label,
      timestamp: Date.now(),
    };
    setHistory([entry]);
    setCurrentIndex(0);
  }, []);

  return {
    state: currentState,
    currentLabel,
    history,
    currentIndex,
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    jumpTo,
    resetHistory,
  };
}
