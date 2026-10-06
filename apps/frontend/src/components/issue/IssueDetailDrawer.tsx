import React, { useEffect } from "react";
import { X, Kanban } from "lucide-react";
import type { IssueWithComments, Section, Issue } from "../../lib/types";
import { useWorkspace } from "../../context/WorkspaceContext";

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
          <div className="text-sm text-[var(--color-muted-foreground)]">
            Loading issue details...
          </div>
        </div>
      </aside>
    </>
  );
};

export default IssueDetailDrawer;
