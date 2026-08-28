import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/Toast/ToastContainer';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = toast.id || `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const duration = toast.duration !== undefined ? toast.duration : (toast.type === 'error' ? 6000 : 4000);

    const newToast = {
      ...toast,
      id,
      duration,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      // Limit to 5 visible toasts to avoid viewport clutter
      const filtered = prev.slice(-4);
      return [...filtered, newToast];
    });

    return id;
  }, []);

  const success = useCallback((message, options = {}) => {
    return addToast({ type: 'success', message, ...options });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ type: 'error', message, ...options });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({ type: 'warning', message, ...options });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ type: 'info', message, ...options });
  }, [addToast]);

  const promiseToast = useCallback(async (promise, { loading = 'Processing...', success: successMsg, error: errorMsg } = {}) => {
    const id = addToast({ type: 'info', message: loading, duration: 0 }); // indefinite until resolved
    try {
      const result = await promise;
      const finalMsg = typeof successMsg === 'function' ? successMsg(result) : (successMsg || 'Action completed successfully');
      removeToast(id);
      addToast({ type: 'success', message: finalMsg });
      return result;
    } catch (err) {
      const finalErr = typeof errorMsg === 'function' ? errorMsg(err) : (errorMsg || err?.message || 'Operation failed');
      removeToast(id);
      addToast({ type: 'error', message: finalErr });
      throw err;
    }
  }, [addToast, removeToast]);

  const toastMethods = {
    add: addToast,
    dismiss: removeToast,
    success,
    error,
    warning,
    info,
    promise: promiseToast,
  };

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
