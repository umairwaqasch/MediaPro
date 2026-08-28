import React from 'react';
import ToastItem from './ToastItem';

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-full pointer-events-none p-2"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto transition-all duration-300">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
