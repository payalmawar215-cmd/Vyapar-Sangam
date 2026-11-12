// Simple toast hook — no external library needed
import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ description, variant = 'default', duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, description, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return { toast, toasts };
}

// Global toast context (simple singleton approach)
let globalToast = null;

export function setGlobalToast(fn) {
  globalToast = fn;
}

export function showToast(opts) {
  if (globalToast) globalToast(opts);
}
