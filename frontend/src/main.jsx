import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './context/ToastContext';
import { TaskProvider } from './context/TaskContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <TaskProvider>
        <App />
      </TaskProvider>
    </ToastProvider>
  </React.StrictMode>
);

