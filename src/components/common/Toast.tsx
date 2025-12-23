import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

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
  showSuccessAnimation: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

interface InternalToast extends Required<ToastOptions> {}

// Success Checkmark Animation Component
const SuccessCheckmark: React.FC<{ visible: boolean; onComplete: () => void }> = ({ visible, onComplete }) => {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit' | 'hidden'>('hidden');

  useEffect(() => {
    if (visible) {
      setPhase('enter');
      // Transition to 'show' after enter animation
      const enterTimer = setTimeout(() => setPhase('show'), 100);
      // Start exit after showing
      const showTimer = setTimeout(() => setPhase('exit'), 1500);
      // Hide completely after exit animation
      const exitTimer = setTimeout(() => {
        setPhase('hidden');
        onComplete();
      }, 2000);
      return () => {
        clearTimeout(enterTimer);
        clearTimeout(showTimer);
        clearTimeout(exitTimer);
      };
    }
  }, [visible, onComplete]);

  if (phase === 'hidden') return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none"
      aria-live="polite"
    >
      <div
        className={`
          flex flex-col items-center justify-center
          transition-all duration-500 ease-out
          ${phase === 'enter' ? 'opacity-0 scale-50' : ''}
          ${phase === 'show' ? 'opacity-100 scale-100' : ''}
          ${phase === 'exit' ? 'opacity-0 scale-110' : ''}
        `}
      >
        {/* Circle background */}
        <div className="relative w-24 h-24 rounded-full bg-green-500 shadow-lg flex items-center justify-center">
          {/* Animated checkmark */}
          <svg
            className="w-14 h-14 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              className={`
                ${phase !== 'hidden' ? 'animate-checkmark' : ''}
              `}
              d="M5 13l4 4L19 7"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: phase === 'enter' ? 24 : 0,
                transition: 'stroke-dashoffset 0.4s ease-out 0.2s'
              }}
            />
          </svg>
        </div>
        {/* Success text */}
        <p className={`
          mt-4 text-lg font-semibold text-green-600 bg-white/90 px-4 py-1 rounded-full shadow
          transition-all duration-300 delay-300
          ${phase === 'enter' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
        `}>
          Success!
        </p>
      </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<InternalToast[]>([]);
  const [showCheckmark, setShowCheckmark] = useState(false);

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

  const showSuccessAnimation = useCallback(() => {
    setShowCheckmark(true);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setShowCheckmark(false);
  }, []);

  const value = useMemo(() => ({ showToast, showSuccessAnimation }), [showToast, showSuccessAnimation]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Success checkmark animation */}
      <SuccessCheckmark visible={showCheckmark} onComplete={handleAnimationComplete} />
      {/* Toast notifications */}
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




