import React from "react";
import { Spinner } from "./Spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = "",
      disabled,
      type = "button",
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    // If button is icon-only and no aria-label provided, fall back safely
    const computedAriaLabel =
      ariaLabel || (typeof children === "string" ? children : undefined);

    const baseClasses =
      "inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2";

    const variantClasses = {
      primary:
        "bg-[var(--color-accent)] text-white hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 shadow-[var(--shadow-sm)]",
      secondary:
        "bg-transparent text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 active:translate-y-0 font-semibold",
      outline:
        "bg-transparent text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-muted)] active:bg-[var(--color-muted)]/80",
      ghost:
        "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)] active:bg-[var(--color-muted)]/80",
      destructive:
        "bg-[var(--color-destructive)] text-[var(--color-on-destructive)] hover:opacity-90 active:translate-y-0",
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs rounded-[var(--radius-sm)] gap-1.5",
      md: "px-4 py-2 text-sm rounded-[var(--radius-md)] gap-2",
      lg: "px-6 py-3 text-base rounded-[var(--radius-md)] gap-2.5",
      icon: "p-2 rounded-[var(--radius-md)] w-9 h-9",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-label={computedAriaLabel}
        aria-busy={isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Spinner size={size === "lg" ? "md" : "sm"} />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {size !== "icon" && children}
        {size === "icon" && !isLoading && children}
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
