import React, { useState } from "react";

export interface AvatarProps {
  src?: string;
  name?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "away";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  fallback,
  size = "md",
  status,
  className = "",
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (n?: string) => {
    if (!n) return fallback || "?";
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0]?.[0] || "";
      const last = parts[parts.length - 1]?.[0] || "";
      return (first + last).toUpperCase() || fallback || "?";
    }
    return n.slice(0, 2).toUpperCase() || fallback || "?";
  };

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
    xl: "w-14 h-14 text-lg font-bold",
  };

  const statusIndicatorClasses = {
    xs: "w-1.5 h-1.5 bottom-0 right-0",
    sm: "w-2 h-2 bottom-0 right-0",
    md: "w-2.5 h-2.5 bottom-0 right-0",
    lg: "w-3 h-3 bottom-0.5 right-0.5",
    xl: "w-3.5 h-3.5 bottom-0.5 right-0.5",
  };

  const statusColorClasses = {
    online: "bg-emerald-500",
    offline: "bg-gray-400",
    away: "bg-amber-500",
  };

  const initials = getInitials(name);
  const showImage = src && !imageError;

  return (
    <div
      className={`relative inline-flex shrink-0 select-none items-center justify-center font-semibold rounded-full border border-[var(--color-border)] ${sizeClasses[size]} ${className}`}
      aria-label={name ? `Avatar of ${name}` : "User avatar"}
    >
      {showImage ? (
        <img
          src={src}
          alt={name || "User avatar"}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center bg-[var(--color-muted)] text-[var(--color-foreground)]">
          {initials}
        </div>
      )}

      {status && (
        <span
          className={`absolute rounded-full ring-2 ring-[var(--color-card)] ${statusIndicatorClasses[size]} ${statusColorClasses[status]}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

export default Avatar;
