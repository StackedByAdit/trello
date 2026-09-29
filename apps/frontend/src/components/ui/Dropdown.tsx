import React, { useState, useRef, useEffect } from "react";

export interface DropdownItem {
  id?: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: (props: { isOpen: boolean }) => React.ReactElement;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = "right",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger({ isOpen })}
      </div>

      {isOpen && (
        <div
          role="menu"
          className={`absolute z-50 mt-1.5 min-w-[190px] py-1.5 bg-[var(--color-card)] text-[var(--color-card-foreground)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] animate-in fade-in zoom-in-95
            ${align === "right" ? "right-0" : "left-0"}`}
        >
          {items.map((item, idx) => {
            if (item.divider) {
              return (
                <div
                  key={`div-${idx}`}
                  role="separator"
                  className="my-1 border-t border-[var(--color-border)]"
                />
              );
            }

            return (
              <button
                key={item.id || `item-${idx}`}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick?.();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors duration-150 cursor-pointer select-none
                  disabled:opacity-40 disabled:cursor-not-allowed
                  focus-visible:outline-none focus-visible:bg-[var(--color-muted)]
                  ${
                    item.destructive
                      ? "text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
                      : "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                  }`}
              >
                {item.icon && (
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center text-current" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
