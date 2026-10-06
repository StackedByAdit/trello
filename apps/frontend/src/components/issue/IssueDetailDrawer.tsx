import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Kanban, AlertCircle } from "lucide-react";
import { getIssue, updateIssue } from "../../lib/api";
import type { IssueWithComments, Section, Issue } from "../../lib/types";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../ui/Toast";
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
  const { toast } = useToast();

  const [issue, setIssue] = useState<IssueWithComments | null>(
    initialIssue ? (initialIssue as IssueWithComments) : null
  );
  const [isLoading, setIsLoading] = useState(!initialIssue);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Title inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(initialIssue?.title || "");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isTitleEscapePressedRef = useRef(false);

  // Description inline editing state
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(initialIssue?.description || "");
  const descInputRef = useRef<HTMLTextAreaElement>(null);
  const isDescEscapePressedRef = useRef(false);

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
      setTitleValue(data.title);
      setDescValue(data.description || "");
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

  // Sync initialIssue if it changes
  useEffect(() => {
    if (initialIssue && initialIssue.id === issueId) {
      setIssue((prev) => prev || (initialIssue as IssueWithComments));
      if (!isEditingTitle) setTitleValue(initialIssue.title);
      if (!isEditingDesc) setDescValue(initialIssue.description || "");
    }
  }, [initialIssue, issueId, isEditingTitle, isEditingDesc]);

  // Lock body scroll and handle Escape key navigation
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditingTitle) {
          isTitleEscapePressedRef.current = true;
          setTitleValue(issue?.title || "");
          setIsEditingTitle(false);
          return;
        }
        if (isEditingDesc) {
          isDescEscapePressedRef.current = true;
          setDescValue(issue?.description || "");
          setIsEditingDesc(false);
          return;
        }
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditingTitle, isEditingDesc, issue, onClose]);

  // Focus Title input when entering edit mode
  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  // Focus Description input when entering edit mode
  useEffect(() => {
    if (isEditingDesc) {
      descInputRef.current?.focus();
      descInputRef.current?.select();
    }
  }, [isEditingDesc]);

  // Handle Title Update (Save on Blur, Escape to cancel)
  const handleTitleSave = async () => {
    if (isTitleEscapePressedRef.current) {
      isTitleEscapePressedRef.current = false;
      return;
    }
    if (!issue) return;
    const trimmed = titleValue.trim();
    if (!trimmed) {
      setTitleValue(issue.title);
      setIsEditingTitle(false);
      return;
    }
    if (trimmed === issue.title) {
      setIsEditingTitle(false);
      return;
    }

    const previousTitle = issue.title;
    setIssue((prev) => (prev ? { ...prev, title: trimmed } : prev));
    setIsEditingTitle(false);

    try {
      const updated = await updateIssue({
        issueId: issue.id,
        title: trimmed,
      });
      const merged = { ...issue, title: updated.title };
      setIssue(merged);
      onIssueUpdated?.(merged);
      toast({
        title: "Title updated",
        description: "Issue title saved successfully.",
        variant: "success",
        duration: 1500,
      });
    } catch (err: any) {
      setTitleValue(previousTitle);
      setIssue((prev) => (prev ? { ...prev, title: previousTitle } : prev));
      toast({
        title: "Could not update title",
        description: err?.message || "Failed to update title",
        variant: "error",
      });
    }
  };

  // Handle Description Update (Save on Blur, Escape to cancel)
  const handleDescSave = async () => {
    if (isDescEscapePressedRef.current) {
      isDescEscapePressedRef.current = false;
      return;
    }
    if (!issue) return;
    const trimmed = descValue.trim();
    if (trimmed === (issue.description || "")) {
      setIsEditingDesc(false);
      return;
    }

    const previousDesc = issue.description;
    setIssue((prev) => (prev ? { ...prev, description: trimmed } : prev));
    setIsEditingDesc(false);

    try {
      const updated = await updateIssue({
        issueId: issue.id,
        description: trimmed,
      });
      const merged = { ...issue, description: updated.description };
      setIssue(merged);
      onIssueUpdated?.(merged);
      toast({
        title: "Description updated",
        description: "Saved changes.",
        variant: "success",
        duration: 1500,
      });
    } catch (err: any) {
      setDescValue(previousDesc || "");
      setIssue((prev) => (prev ? { ...prev, description: previousDesc } : prev));
      toast({
        title: "Could not update description",
        description: err?.message || "Failed to update description",
        variant: "error",
      });
    }
  };

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

          {/* MAIN ISSUE DETAILS */}
          {issue && !isNotFound && (
            <>
              {/* 1. TITLE (Inline Editable, Save on Blur, Escape to cancel) */}
              <div>
                {isEditingTitle ? (
                  <div className="space-y-1">
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleTitleSave();
                        }
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          isTitleEscapePressedRef.current = true;
                          setTitleValue(issue.title);
                          setIsEditingTitle(false);
                        }
                      }}
                      className="w-full text-xl sm:text-2xl font-bold bg-[var(--color-card)] border-2 border-[var(--color-primary)] rounded-[var(--radius-md)] p-2 text-[var(--color-foreground)] focus:outline-none shadow-[var(--shadow-sm)]"
                      placeholder="Issue title"
                    />
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Press Enter or click outside to save • Esc to cancel
                    </p>
                  </div>
                ) : (
                  <h1
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/60 p-1.5 -ml-1.5 rounded-[var(--radius-md)] cursor-text transition-colors leading-tight"
                    title="Click to edit title"
                  >
                    {issue.title}
                  </h1>
                )}
              </div>

              {/* 2. DESCRIPTION (Inline Editable, Save on Blur, Escape to cancel) */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Description
                </span>

                {isEditingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      ref={descInputRef}
                      value={descValue}
                      onChange={(e) => setDescValue(e.target.value)}
                      onBlur={handleDescSave}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          isDescEscapePressedRef.current = true;
                          setDescValue(issue.description || "");
                          setIsEditingDesc(false);
                        }
                      }}
                      rows={4}
                      placeholder="Add a more detailed description..."
                      className="w-full text-sm bg-[var(--color-card)] border-2 border-[var(--color-primary)] rounded-[var(--radius-md)] p-3 text-[var(--color-foreground)] focus:outline-none shadow-[var(--shadow-sm)] leading-relaxed"
                    />
                    <div className="flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)]">
                      <span>Click outside or Save • Esc to cancel</span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleDescSave}
                        className="cursor-pointer font-medium"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="p-3 rounded-[var(--radius-md)] bg-[var(--color-muted)]/20 hover:bg-[var(--color-muted)]/50 border border-[var(--color-border)] cursor-text transition-colors min-h-[72px]"
                    title="Click to edit description"
                  >
                    {issue.description ? (
                      <p className="text-sm text-[var(--color-foreground)] whitespace-pre-wrap leading-relaxed">
                        {issue.description}
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--color-muted-foreground)] italic">
                        Add a more detailed description...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default IssueDetailDrawer;
