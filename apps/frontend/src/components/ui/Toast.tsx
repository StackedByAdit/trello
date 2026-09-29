import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (item: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info", duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, title, description, variant, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      {/* Toast floating viewport */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const ToastCard: React.FC<{ toast: ToastItem; onClose: () => void }> = ({
  toast,
  onClose,
}) => {
  const variantIcons = {
    info: <Info className="w-5 h-5 text-sky-500" aria-hidden="true" />,
    success: (
      <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden="true" />
    ),
    warning: (
      <AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" />
    ),
    error: (
      <AlertCircle
        className="w-5 h-5 text-[var(--color-destructive)]"
        aria-hidden="true"
      />
    ),
  };

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start gap-3 p-4 bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] transition-all duration-200 animate-in slide-in-from-bottom-3"
    >
      <span className="shrink-0 mt-0.5">{variantIcons[toast.variant || "info"]}</span>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold tracking-tight">{toast.title}</h4>
        {toast.description && (
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="shrink-0 p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] rounded-[var(--radius-sm)] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default ToastProvider;
