import React, { useState, useEffect, useCallback } from "react";
import { X, Kanban, AlertCircle } from "lucide-react";
import { getIssue } from "../../lib/api";
import type { IssueWithComments, Section, Issue } from "../../lib/types";
import { useWorkspace } from "../../context/WorkspaceContext";
import { Button } from "../ui/Button";

interface IssueDetailDrawerProps {
  boardId: string;
  issueId: string;
  sections: Section[];
  initialIssue?: Issue | IssueWithComments;
  onClose: () => void;
  onIssueUpdated?: (updatedIssue: IssueWithComments | Issue) => void;
  onIssueMoved?: (issueId: string, targetSectionId: string) => void;
  onIssueDeleted?: (issueId: string) => void;
}

export const IssueDetailDrawer: React.FC<IssueDetailDrawerProps> = ({
  boardId,
  issueId,
  sections,
  initialIssue,
  onClose,
  onIssueUpdated,
  onIssueMoved,
  onIssueDeleted,
}) => {
  const { activeOrg } = useWorkspace();

  const [issue, setIssue] = useState<IssueWithComments | null>(
    initialIssue ? (initialIssue as IssueWithComments) : null
  );
  const [isLoading, setIsLoading] = useState(!initialIssue);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch issue details
  const fetchIssueDetail = useCallback(async () => {
    if (!issueId) return;

    if (!issue || issue.id !== issueId) {
      setIsLoading(true);
    }
    setIsNotFound(false);
    setErrorMessage(null);

    try {
      const data = await getIssue(issueId);
      setIssue(data);
    } catch (err: any) {
      if (err?.status === 404) {
        setIsNotFound(true);
      } else {
        setErrorMessage(
          err?.data?.message || err?.message || "Failed to load issue details"
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchIssueDetail();
  }, [fetchIssueDetail]);

  // Lock body scroll and handle Escape key navigation
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <>
      {/* Drawer Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-Side Drawer Container */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Issue details"
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[500px] md:w-[560px] lg:w-[620px] bg-[var(--color-card)] border-l border-[var(--color-border)] shadow-[var(--shadow-xl)] flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
      >
        {/* ================= DRAWER TOP BAR ================= */}
        <div className="h-14 px-4 sm:px-6 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0 bg-[var(--color-card)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
              <Kanban className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] truncate">
              {activeOrg?.name || "Workspace"} / Issue Detail
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
              title="Close drawer (Esc)"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= DRAWER CONTENT VIEWPORT ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
          {/* LOADING STATE */}
          {isLoading && !issue && (
            <div className="space-y-6 animate-pulse" role="status" aria-label="Loading issue details">
              <div className="h-8 w-3/4 bg-[var(--color-muted)] rounded-[var(--radius-sm)]" />
              <div className="space-y-2">
                <div className="h-4 w-28 bg-[var(--color-muted)] rounded" />
                <div className="h-9 w-48 bg-[var(--color-muted)] rounded-[var(--radius-md)]" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-28 bg-[var(--color-muted)] rounded" />
                <div className="h-24 w-full bg-[var(--color-muted)] rounded-[var(--radius-md)]" />
              </div>
              <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
                <div className="h-5 w-32 bg-[var(--color-muted)] rounded" />
                <div className="h-16 w-full bg-[var(--color-muted)] rounded-[var(--radius-md)]" />
              </div>
            </div>
          )}

          {/* NOT FOUND 404 STATE */}
          {!isLoading && isNotFound && (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-muted)] flex items-center justify-center mx-auto text-[var(--color-muted-foreground)]">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--color-foreground)]">
                  Issue Not Found
                </h2>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1 max-w-sm mx-auto">
                  This issue may have been removed or moved to another board.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="cursor-pointer mx-auto"
              >
                Back to Board
              </Button>
            </div>
          )}

          {/* ERROR STATE */}
          {!isLoading && !isNotFound && errorMessage && (
            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 text-center space-y-3">
              <AlertCircle className="w-6 h-6 text-[var(--color-destructive)] mx-auto" />
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {errorMessage}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchIssueDetail}
                className="cursor-pointer mx-auto"
              >
                Retry
              </Button>
            </div>
          )}

          {/* MAIN ISSUE CONTENT */}
          {issue && !isNotFound && (
            <div className="space-y-4">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)]">
                {issue.title}
              </h1>
              {issue.description && (
                <p className="text-sm text-[var(--color-foreground)] whitespace-pre-wrap leading-relaxed">
                  {issue.description}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default IssueDetailDrawer;
