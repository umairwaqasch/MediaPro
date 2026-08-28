import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './ToastContext';

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const toast = useToast();

  const [activeTasks, setActiveTasks] = useState([]);
  const [activeBatches, setActiveBatches] = useState([]);
  const [completedTasks, setCompletedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('vp_completed_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [telemetry, setTelemetry] = useState({
    gpu_name: null,
    gpu_load_percent: 0,
    vram_used_gb: 0,
    vram_total_gb: 6,
    gpu_temp_c: null,
    cpu_count: 8,
    ram_used_gb: 0,
    ram_total_gb: 16,
    disk_free_gb: null,
    celery_active: 0,
    celery_reserved: 0,
    nvenc_available: true,
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const activeBatchesRef = useRef(activeBatches);
  activeBatchesRef.current = activeBatches;

  // 1. Fetch live system hardware telemetry every 3 seconds
  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/mediapro/api/system/telemetry');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch {
      // Telemetry poll is non-critical
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // 2. Poll & sync active batches
  const syncBatches = useCallback(async () => {
    try {
      const res = await fetch('/mediapro/api/batch/jobs/active');
      if (res.ok) {
        const data = await res.json();
        const serverBatches = data.batches || [];

        // Check for newly completed batches to trigger toast notifications
        const currentBatchMap = new Map(activeBatchesRef.current.map((b) => [b.batch_id, b]));

        serverBatches.forEach((batch) => {
          const prev = currentBatchMap.get(batch.batch_id);
          if (prev && !prev.is_all_finished && batch.is_all_finished) {
            if (batch.status === 'COMPLETED') {
              toast.success(`Batch "${batch.operation}" completed! (${batch.completed_items}/${batch.total_items} items)`);
            } else if (batch.status === 'PARTIAL_FAILURE') {
              toast.warning(`Batch "${batch.operation}" finished with ${batch.failed_items} errors.`);
            }
          }
        });

        setActiveBatches(serverBatches);
      }
    } catch {
      // Sync failure is non-fatal
    }
  }, [toast]);

  useEffect(() => {
    syncBatches();
    const interval = setInterval(syncBatches, 2000);
    return () => clearInterval(interval);
  }, [syncBatches]);

  // 3. Register a newly launched batch
  const registerBatch = useCallback((batchData) => {
    setActiveBatches((prev) => {
      const exists = prev.some((b) => b.batch_id === batchData.batch_id);
      return exists ? prev : [batchData, ...prev];
    });
    toast.info(`Batch "${batchData.operation}" queued (${batchData.total_items} items)`, {
      action: {
        label: 'Open Task Center',
        onClick: () => setIsDrawerOpen(true),
      },
    });
  }, [toast]);

  // 4. Cancel a batch
  const cancelBatch = useCallback(async (batchId) => {
    try {
      const res = await fetch(`/mediapro/api/batch/jobs/${batchId}/cancel`, { method: 'POST' });
      if (res.ok) {
        toast.warning(`Batch ${batchId} cancelled`);
        syncBatches();
      }
    } catch (err) {
      toast.error(`Failed to cancel batch: ${err.message}`);
    }
  }, [toast, syncBatches]);

  // 5. Register a single task
  const registerTask = useCallback((task) => {
    setActiveTasks((prev) => [task, ...prev]);
  }, []);

  // 6. Cancel a single task
  const cancelTask = useCallback(async (taskId) => {
    try {
      const res = await fetch(`/mediapro/api/tasks/${taskId}/cancel`, { method: 'POST' });
      if (res.ok) {
        toast.warning(`Task ${taskId.slice(0, 8)} cancelled`);
        setActiveTasks((prev) => prev.filter((t) => t.task_id !== taskId));
      }
    } catch (err) {
      toast.error(`Failed to cancel task: ${err.message}`);
    }
  }, [toast]);

  // 7. Clear completed tasks
  const clearCompleted = useCallback(async () => {
    try {
      await fetch('/mediapro/api/tasks/clear-completed', { method: 'POST' });
      setCompletedTasks([]);
      localStorage.removeItem('vp_completed_tasks');
      toast.success('Completed tasks cleared');
    } catch {
      toast.error('Failed to clear completed tasks');
    }
  }, [toast]);

  const totalActiveJobs = activeBatches.length + activeTasks.length;

  const value = {
    activeTasks,
    activeBatches,
    completedTasks,
    telemetry,
    totalActiveJobs,
    isDrawerOpen,
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),
    toggleDrawer: () => setIsDrawerOpen((prev) => !prev),
    registerBatch,
    cancelBatch,
    registerTask,
    cancelTask,
    clearCompleted,
    refreshTelemetry: fetchTelemetry,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTaskCenter() {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error('useTaskCenter must be used within a TaskProvider');
  }
  return ctx;
}
