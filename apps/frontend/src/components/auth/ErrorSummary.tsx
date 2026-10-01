import React from "react";
import { AlertCircle } from "lucide-react";

export interface ErrorSummaryItem {
  fieldId: string;
  message: string;
}

export interface ErrorSummaryProps {
  title: string;
  errors?: ErrorSummaryItem[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

/**
 * Accessible Error Summary component complying with ui-ux-pro-max rule #109 & WCAG:
 * - Rendered at top of form
 * - role="alert", aria-labelledby
 * - Focusable via tabIndex={-1} so focus moves to it on failed submission
 * - Clickable links direct keyboard/screen reader focus straight to invalid fields
 */
export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  title,
  errors = [],
  containerRef,
  className = "",
}) => {
  if (!title && errors.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="alert"
      tabIndex={-1}
      aria-labelledby="error-summary-title"
      className={`mb-5 p-3.5 bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/30 rounded-[var(--radius-md)] text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-destructive)] transition-all ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle
          className="w-4 h-4 text-[var(--color-destructive)] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <h3
            id="error-summary-title"
            className="text-xs sm:text-sm font-bold text-[var(--color-destructive)] leading-snug"
          >
            {title}
          </h3>
          {errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-[var(--color-destructive)] list-disc list-inside">
              {errors.map((item, idx) => (
                <li key={`${item.fieldId}-${idx}`}>
                  <a
                    href={`#${item.fieldId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(item.fieldId);
                      if (element) {
                        element.focus();
                        element.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }
                    }}
                    className="underline font-medium hover:opacity-85 focus:outline-none focus:ring-1 focus:ring-[var(--color-destructive)] rounded px-0.5 cursor-pointer"
                  >
                    {item.message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorSummary;
