import React, { useId } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = "",
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="flex flex-col gap-1.5 w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-[var(--color-muted-foreground)] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={`w-full px-3.5 py-2.5 bg-[var(--color-card)] text-[var(--color-foreground)] border rounded-[var(--radius-md)] text-sm transition-all duration-200 outline-none
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon ? "pr-10" : ""}
              ${
                error
                  ? "border-[var(--color-destructive)] focus:ring-2 focus:ring-[var(--color-destructive)]/20"
                  : "border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)]/25"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-[var(--color-muted-foreground)]/70
              ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 text-[var(--color-muted-foreground)] flex items-center justify-center">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-medium text-[var(--color-destructive)] animate-in fade-in"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p
            id={helperId}
            className="text-xs text-[var(--color-muted-foreground)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
