import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './context/ToastContext';
import { TaskProvider } from './context/TaskContext';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <TaskProvider>
          <App />
        </TaskProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

