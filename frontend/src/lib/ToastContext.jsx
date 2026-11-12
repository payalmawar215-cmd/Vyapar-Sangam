import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext({
  toast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = 'default', duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Renderer */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`font-body text-sm px-6 py-4 rounded-xl border shadow-xl min-w-[260px] max-w-[400px] pointer-events-auto transition-all duration-300 animate-fade-in ${
              t.variant === 'destructive'
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : 'bg-card border-border text-foreground'
            }`}
          >
            {t.title && <p className="font-medium mb-1">{t.title}</p>}
            <p>{t.description}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastContext;
