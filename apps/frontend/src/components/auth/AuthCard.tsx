import React from "react";
import { Link } from "react-router";
import { Kanban, Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/Button";

export interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerPrompt: string;
  footerLinkText: string;
  footerLinkTo: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  title,
  subtitle,
  children,
  footerPrompt,
  footerLinkText,
  footerLinkTo,
}) => {
  const { theme, actualTheme, toggleTheme } = useTheme();

  const themeIcon =
    theme === "system" ? (
      <Laptop className="w-4 h-4" aria-hidden="true" />
    ) : actualTheme === "dark" ? (
      <Moon className="w-4 h-4 text-teal-400" aria-hidden="true" />
    ) : (
      <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
    );

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-[var(--color-background)] text-[var(--color-foreground)] font-sans antialiased relative selection:bg-[var(--color-primary)] selection:text-white transition-colors duration-200">
      {/* Top Bar with Theme Toggle */}
      <header className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label={`Toggle theme (currently ${theme})`}
          title={`Theme: ${theme}`}
          className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] border border-[var(--color-border)]/60 bg-[var(--color-card)]/50 backdrop-blur-sm cursor-pointer"
        >
          {themeIcon}
          <span className="text-xs font-semibold capitalize hidden sm:inline ml-1">
            {theme}
          </span>
        </Button>
      </header>

      {/* Main Centered Auth Card Container */}
      <main className="w-full max-w-[420px] bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-6 sm:p-8 shadow-[var(--shadow-xl)] transition-all duration-200 animate-in fade-in">
        {/* Brand Mark & Header */}
        <div className="flex flex-col items-center mb-6 text-center select-none">
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white flex items-center justify-center shadow-[var(--shadow-md)] mb-3 transition-transform hover:scale-105 duration-200">
            <Kanban className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="font-extrabold text-2xl tracking-tight text-[var(--color-foreground)]">
              Trello
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)] tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1 max-w-xs leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Form Body */}
        {children}

        {/* Footer Navigation Link */}
        <div className="mt-6 pt-5 border-t border-[var(--color-border)]/60 text-center">
          <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)]">
            {footerPrompt}{" "}
            <Link
              to={footerLinkTo}
              className="font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded px-1 py-0.5 cursor-pointer transition-colors"
            >
              {footerLinkText}
            </Link>
          </p>
        </div>
      </main>

      {/* Subtle security/privacy note */}
      <footer className="mt-6 text-center">
        <p className="text-[11px] text-[var(--color-muted-foreground)]/70">
          Protected with industry-standard 256-bit encryption.
        </p>
      </footer>
    </div>
  );
};

export default AuthCard;
