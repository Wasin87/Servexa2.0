import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { ConfettiCelebration } from '../components/common/ConfettiCelebration';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void;
  triggerConfettiBurst: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confettiKey, setConfettiKey] = useState<number>(0);
  const [confettiActive, setConfettiActive] = useState<boolean>(false);
  const timeoutMapRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
    if (timeoutMapRef.current[id]) {
      clearTimeout(timeoutMapRef.current[id]);
      delete timeoutMapRef.current[id];
    }
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
    timeoutMapRef.current[id] = setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const triggerConfettiBurst = useCallback(() => {
    setConfettiKey((prev) => prev + 1);
    setConfettiActive(true);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, triggerConfettiBurst }}>
      {children}

      {confettiActive && (
        <ConfettiCelebration
          key={confettiKey}
          active={confettiActive}
          onComplete={() => setConfettiActive(false)}
        />
      )}

      {toasts.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 right-3 sm:right-6 left-3 sm:left-auto z-[5000] flex flex-col gap-2 max-w-md pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl border flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 ${
                toast.variant === 'error'
                  ? 'bg-rose-950 text-white border-rose-500/60'
                  : toast.variant === 'info'
                  ? 'bg-zinc-900 text-white border-blue-500/50'
                  : 'bg-zinc-900 text-white border-emerald-500/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {toast.variant === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : toast.variant === 'info' ? (
                  <Info className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="leading-snug">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-zinc-400 hover:text-white shrink-0 cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
