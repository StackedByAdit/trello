import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "accent"
    | "outline"
    | "success"
    | "destructive";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  size = "md",
  dot = false,
  children,
  className = "",
  ...props
}) => {
  const variantClasses = {
    default:
      "bg-[var(--color-primary)]/15 text-[var(--color-foreground)] border border-[var(--color-primary)]/30",
    secondary:
      "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border border-transparent",
    accent:
      "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30",
    outline:
      "bg-transparent text-[var(--color-foreground)] border border-[var(--color-border)]",
    success:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    destructive:
      "bg-[var(--color-destructive)]/15 text-[var(--color-destructive)] border border-[var(--color-destructive)]/30",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1 rounded-[var(--radius-sm)]",
    md: "px-2.5 py-1 text-xs gap-1.5 rounded-[var(--radius-sm)]",
  };

  return (
    <span
      className={`inline-flex items-center font-medium leading-none select-none tracking-tight whitespace-nowrap shrink-0 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-current opacity-80"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
