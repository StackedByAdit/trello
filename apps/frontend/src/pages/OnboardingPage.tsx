import React, { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Building2, Sparkles, ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "../auth";
import { createOrganization } from "../lib/api";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { useToast } from "../components/ui/Toast";
import {
  ErrorSummary,
  type ErrorSummaryItem,
} from "../components/auth/ErrorSummary";

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();

  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [summaryErrors, setSummaryErrors] = useState<{
    title: string;
    items: ErrorSummaryItem[];
  } | null>(null);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = orgName.trim();
    if (!trimmedName) {
      setNameError("Organization name is required");
      setSummaryErrors({
        title: "Please complete required fields",
        items: [
          {
            fieldId: "org-name",
            message: "Organization name is required",
          },
        ],
      });
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
      return;
    }

    setNameError(undefined);
    setSummaryErrors(null);
    setIsSubmitting(true);

    try {
      await createOrganization({
        name: trimmedName,
        description: description.trim() || undefined,
      });

      toast({
        title: "Workspace created!",
        description: `Welcome to ${trimmedName}. Let's build something great.`,
        variant: "success",
      });

      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.message || "Failed to create organization";
      setNameError(msg);
      setSummaryErrors({
        title: "Could not create workspace",
        items: [{ fieldId: "org-name", message: msg }],
      });
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-[var(--color-background)] text-[var(--color-foreground)] selection:bg-[var(--color-primary)] selection:text-white">
      <main className="w-full max-w-[480px] bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-6 sm:p-8 shadow-[var(--shadow-xl)] animate-in fade-in">
        <div className="flex flex-col items-center mb-6 text-center select-none">
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white flex items-center justify-center shadow-[var(--shadow-md)] mb-3">
            <Building2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <Badge variant="accent" size="sm" className="mb-2">
            <Sparkles className="w-3 h-3 mr-1" /> Quick Setup
          </Badge>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)] tracking-tight">
            Create your first workspace
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1 max-w-sm leading-relaxed">
            Workspaces organize your boards, issues, and team members in one place.
          </p>
        </div>

        {summaryErrors && (
          <ErrorSummary
            containerRef={errorSummaryRef}
            title={summaryErrors.title}
            errors={summaryErrors.items}
          />
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="org-name"
            name="name"
            type="text"
            label={
              <span>
                Organization Name{" "}
                <span className="text-[var(--color-destructive)]">*</span>
              </span>
            }
            placeholder="e.g. Acme Engineering or Marketing Hub"
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
            disabled={isSubmitting}
            required
            autoFocus
            leftIcon={<Building2 className="w-4 h-4" aria-hidden="true" />}
          />

          <Input
            id="org-desc"
            name="description"
            type="text"
            label="Description (Optional)"
            placeholder="What does this workspace do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="pt-3 flex flex-col gap-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full py-2.5 font-semibold shadow-[var(--shadow-sm)] cursor-pointer"
            >
              Create Workspace & Continue
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard", { replace: true })}
              className="w-full text-xs text-[var(--color-muted-foreground)] cursor-pointer"
            >
              Skip to Dashboard for now
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
          <span>Signed in</span>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 hover:text-[var(--color-destructive)] cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </main>
    </div>
  );
};

export default OnboardingPage;
