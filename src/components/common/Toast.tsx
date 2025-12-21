import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  type?: ToastType;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

interface InternalToast extends Required<ToastOptions> {}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<InternalToast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((opts: ToastOptions) => {
    const id = opts.id || Math.random().toString(36).slice(2);
    const toast: InternalToast = {
      id,
      title: opts.title || '',
      description: opts.description || '',
      type: opts.type || 'info',
      durationMs: opts.durationMs ?? 5000,
    };
    setToasts((prev) => [...prev, toast]);
    if (toast.durationMs > 0) {
      setTimeout(() => remove(id), toast.durationMs);
    }
  }, [remove]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed z-[9999] top-4 right-4 space-y-3 w-full max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              `rounded-md shadow-lg border px-4 py-3 text-sm backdrop-blur bg-white/90 ` +
              (t.type === 'success' ? 'border-green-200' : t.type === 'error' ? 'border-red-200' : t.type === 'warning' ? 'border-yellow-200' : 'border-gray-200')
            }
            role="status"
          >
            {t.title && <div className="font-medium mb-1">{t.title}</div>}
            {t.description && <div className="text-gray-700">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};




