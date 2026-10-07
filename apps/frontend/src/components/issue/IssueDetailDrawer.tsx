import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  X,
  Trash2,
  Kanban,
  MessageSquare,
  UserPlus,
  Check,
  AlertCircle,
  Edit2,
  Clock,
  Send,
  ChevronDown,
} from "lucide-react";
import {
  getIssue,
  updateIssue,
  moveIssue,
  deleteIssue,
  createComment,
  updateComment,
  deleteComment,
} from "../../lib/api";
import type { IssueWithComments, Comment, Section, Issue } from "../../lib/types";
import { useAuth } from "../../auth";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../ui/Toast";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";

interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

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

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "recently";
  }
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
  const navigate = useNavigate();
  const { userId } = useAuth();
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

  // Section / Status selector state
  const [isMovingSection, setIsMovingSection] = useState(false);

  // Assignees picker state
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);
  const assigneePickerRef = useRef<HTMLDivElement>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>(
    initialIssue?.comments || []
  );
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Delete issue modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingIssue, setIsDeletingIssue] = useState(false);

  // Load assignees from localStorage
  const loadStoredAssignees = useCallback((id: string) => {
    try {
      const stored = localStorage.getItem(`issue_assignees_${id}`);
      if (stored) {
        return JSON.parse(stored) as string[];
      }
    } catch {
      // ignore
    }
    return [];
  }, []);

  const saveStoredAssignees = useCallback((id: string, userIds: string[]) => {
    try {
      localStorage.setItem(`issue_assignees_${id}`, JSON.stringify(userIds));
    } catch {
      // ignore
    }
  }, []);

  // Sync initialIssue if it changes
  useEffect(() => {
    if (initialIssue && initialIssue.id === issueId) {
      setIssue((prev) => prev || (initialIssue as IssueWithComments));
      if (!isEditingTitle) setTitleValue(initialIssue.title);
      if (!isEditingDesc) setDescValue(initialIssue.description || "");
    }
  }, [initialIssue, issueId, isEditingTitle, isEditingDesc]);

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
      // Sort comments with newest first
      const sorted = [...(data.comments || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setComments(sorted);

      const assignees =
        data.issueMappings && data.issueMappings.length > 0
          ? data.issueMappings.map((m) => m.userId)
          : loadStoredAssignees(data.id);
      setAssignedUserIds(assignees);
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
  }, [issueId, loadStoredAssignees]);

  useEffect(() => {
    fetchIssueDetail();
  }, [fetchIssueDetail]);

  // Lock body scroll and Escape key navigation
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // If an inline input or dropdown is active, let them handle it first
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
        if (isAssigneePickerOpen) {
          setIsAssigneePickerOpen(false);
          return;
        }
        if (editingCommentId) {
          setEditingCommentId(null);
          return;
        }
        if (isDeleteModalOpen) {
          setIsDeleteModalOpen(false);
          return;
        }
        // Otherwise close drawer
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isEditingTitle,
    isEditingDesc,
    isAssigneePickerOpen,
    editingCommentId,
    isDeleteModalOpen,
    issue,
    onClose,
  ]);

  // Handle outside click for assignee picker dropdown
  useEffect(() => {
    if (!isAssigneePickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        assigneePickerRef.current &&
        !assigneePickerRef.current.contains(e.target as Node)
      ) {
        setIsAssigneePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAssigneePickerOpen]);

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

  // Workspace members for assignee picker
  const orgMembers: OrgMember[] = [
    {
      id: userId || "me",
      name: "You",
      email: "you@workspace.com",
      role: "Current User",
    },
    {
      id: "member-alex",
      name: "Alex Rivers",
      email: "alex.rivers@workspace.com",
      role: "Engineering",
    },
    {
      id: "member-sarah",
      name: "Sarah Chen",
      email: "sarah.chen@workspace.com",
      role: "Design Lead",
    },
    {
      id: "member-david",
      name: "David Kim",
      email: "david.kim@workspace.com",
      role: "Product Manager",
    },
  ];

  // 1. Handle Title Update (Save on Blur, Escape to cancel)
  const handleTitleSave = async () => {
    if (isTitleEscapePressedRef.current) {
      isTitleEscapePressedRef.current = false;
      return;
    }
    if (!issue) return;
    const trimmed = titleValue.trim();
    if (!trimmed) {
      // Revert if empty
      setTitleValue(issue.title);
      setIsEditingTitle(false);
      return;
    }
    if (trimmed === issue.title) {
      setIsEditingTitle(false);
      return;
    }

    const previousTitle = issue.title;
    // Optimistic update
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
      // Roll back
      setTitleValue(previousTitle);
      setIssue((prev) => (prev ? { ...prev, title: previousTitle } : prev));
      toast({
        title: "Could not update title",
        description: err?.message || "Failed to update title",
        variant: "error",
      });
    }
  };

  // 2. Handle Description Update (Save on Blur, Escape to cancel)
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
    // Optimistic update
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
      // Roll back
      setDescValue(previousDesc || "");
      setIssue((prev) => (prev ? { ...prev, description: previousDesc } : prev));
      toast({
        title: "Could not update description",
        description: err?.message || "Failed to update description",
        variant: "error",
      });
    }
  };

  // 3. Handle Section / Column Change
  const handleSectionChange = async (targetSectionId: string) => {
    if (!issue || issue.sectionId === targetSectionId) return;

    const previousSectionId = issue.sectionId;
    // Optimistic update
    setIssue((prev) => (prev ? { ...prev, sectionId: targetSectionId } : prev));
    setIsMovingSection(true);

    try {
      await moveIssue({
        issueId: issue.id,
        sectionId: targetSectionId,
      });
      onIssueMoved?.(issue.id, targetSectionId);
      toast({
        title: "Moved issue",
        description: `Moved to ${
          sections.find((s) => s.id === targetSectionId)?.title || "new column"
        }.`,
        variant: "success",
        duration: 1500,
      });
    } catch (err: any) {
      // Roll back
      setIssue((prev) => (prev ? { ...prev, sectionId: previousSectionId } : prev));
      toast({
        title: "Could not move issue",
        description: err?.message || "Failed to move issue",
        variant: "error",
      });
    } finally {
      setIsMovingSection(false);
    }
  };

  // 4. Handle Assignee Toggle
  const handleToggleAssignee = (memberId: string) => {
    if (!issue) return;
    const isCurrentlyAssigned = assignedUserIds.includes(memberId);
    const updated = isCurrentlyAssigned
      ? assignedUserIds.filter((id) => id !== memberId)
      : [...assignedUserIds, memberId];

    setAssignedUserIds(updated);
    saveStoredAssignees(issue.id, updated);

    // Notify parent to update cards on the board
    onIssueUpdated?.({
      ...issue,
      issueMappings: updated.map((uid) => ({
        id: uid,
        userId: uid,
        issueId: issue.id,
      })),
    });
  };

  // 5. Handle Add Comment (Ctrl/Cmd+Enter to send)
  const handleAddComment = async () => {
    if (!issue || isSubmittingComment) return;
    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    setIsSubmittingComment(true);
    try {
      const created = await createComment({
        text: trimmed,
        issueId: issue.id,
      });

      const updatedComments = [created, ...comments];
      setComments(updatedComments);
      setNewCommentText("");

      const updatedIssue = { ...issue, comments: updatedComments };
      setIssue(updatedIssue);
      onIssueUpdated?.(updatedIssue);

      toast({
        title: "Comment added",
        description: "Your comment was posted.",
        variant: "success",
        duration: 1500,
      });
    } catch (err: any) {
      toast({
        title: "Could not add comment",
        description: err?.data?.message || err?.message || "Failed to post comment",
        variant: "error",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 6. Handle Edit Comment
  const handleStartEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const handleSaveEditComment = async (commentId: string) => {
    const trimmed = editingCommentText.trim();
    if (!trimmed) return;

    setIsUpdatingComment(true);
    try {
      const updated = await updateComment({
        commentId,
        text: trimmed,
      });

      const updatedComments = comments.map((c) =>
        c.id === commentId ? { ...c, text: updated.text } : c
      );
      setComments(updatedComments);
      setEditingCommentId(null);

      if (issue) {
        const updatedIssue = { ...issue, comments: updatedComments };
        setIssue(updatedIssue);
        onIssueUpdated?.(updatedIssue);
      }

      toast({
        title: "Comment updated",
        description: "Saved changes.",
        variant: "success",
        duration: 1500,
      });
    } catch (err: any) {
      toast({
        title: "Could not update comment",
        description: err?.message || "Failed to edit comment",
        variant: "error",
      });
    } finally {
      setIsUpdatingComment(false);
    }
  };

  // 7. Handle Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    try {
      await deleteComment(commentId);
      const updatedComments = comments.filter((c) => c.id !== commentId);
      setComments(updatedComments);

      if (issue) {
        const updatedIssue = { ...issue, comments: updatedComments };
        setIssue(updatedIssue);
        onIssueUpdated?.(updatedIssue);
      }

      toast({
        title: "Comment deleted",
        description: "Comment removed.",
        variant: "success",
        duration: 1500,
      });
    } catch (err: any) {
      toast({
        title: "Could not delete comment",
        description: err?.message || "Failed to delete comment",
        variant: "error",
      });
    } finally {
      setDeletingCommentId(null);
    }
  };

  // 8. Handle Delete Issue with confirmation
  const handleDeleteIssueConfirm = async () => {
    if (!issue || isDeletingIssue) return;

    setIsDeletingIssue(true);
    try {
      await deleteIssue(issue.id);
      toast({
        title: "Issue deleted",
        description: `"${issue.title}" was removed.`,
        variant: "success",
      });
      setIsDeleteModalOpen(false);
      onIssueDeleted?.(issue.id);
      onClose();
    } catch (err: any) {
      toast({
        title: "Could not delete issue",
        description: err?.message || "Failed to delete issue",
        variant: "error",
      });
    } finally {
      setIsDeletingIssue(false);
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
            <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center shrink-0">
              <Kanban className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] truncate">
              {activeOrg?.name || "Workspace"} / Issue Detail
            </span>
          </div>

          <div className="flex items-center gap-1">
            {issue && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                title="Delete issue"
                aria-label="Delete issue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] rounded-[var(--radius-sm)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
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

              {/* 2. SECTION SELECTOR & METADATA GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-[var(--radius-lg)] bg-[var(--color-muted)]/40 border border-[var(--color-border)]/60 text-xs">
                {/* Column / Status Selector */}
                <div className="space-y-1.5">
                  <label htmlFor="issue-section-select" className="font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider text-[10px]">
                    Status / List
                  </label>
                  <div className="relative">
                    <select
                      id="issue-section-select"
                      value={issue.sectionId}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      disabled={isMovingSection}
                      className="w-full appearance-none bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold text-[var(--color-foreground)] cursor-pointer hover:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors pr-8"
                    >
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] pointer-events-none" />
                  </div>
                </div>

                {/* Created Date */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider text-[10px]">
                    Created
                  </span>
                  <div className="flex items-center gap-1.5 h-9 text-xs text-[var(--color-foreground)] font-medium">
                    <Clock className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
                    <span>{formatRelativeTime(issue.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* 3. ASSIGNEES PICKER */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Assignees ({assignedUserIds.length})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {assignedUserIds.map((memberId) => {
                    const member = orgMembers.find((m) => m.id === memberId);
                    return (
                      <div
                        key={memberId}
                        className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-[var(--color-muted)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-foreground)]"
                      >
                        <Avatar name={member?.name || (memberId === "me" ? "You" : memberId)} size="sm" className="w-5 h-5 text-[10px]" />
                        <span>{member?.name || (memberId === "me" ? "You" : "Team Member")}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAssignee(memberId)}
                          className="hover:text-[var(--color-destructive)] cursor-pointer ml-0.5"
                          title="Remove assignee"
                          aria-label="Remove assignee"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Add Assignee Dropdown Picker */}
                  <div ref={assigneePickerRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAssigneePickerOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Assign</span>
                    </button>

                    {isAssigneePickerOpen && (
                      <div className="absolute left-0 mt-2 z-50 w-64 bg-[var(--color-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] p-2 space-y-1 animate-in fade-in zoom-in-95">
                        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] border-b border-[var(--color-border)] mb-1">
                          Workspace Members
                        </div>
                        {orgMembers.map((member) => {
                          const isAssigned = assignedUserIds.includes(member.id);
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => handleToggleAssignee(member.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs text-left transition-colors cursor-pointer ${
                                isAssigned
                                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold"
                                  : "hover:bg-[var(--color-muted)] text-[var(--color-foreground)]"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar name={member.name} size="sm" className="w-5 h-5 text-[10px]" />
                                <div className="truncate">
                                  <div>{member.name}</div>
                                  <div className="text-[10px] text-[var(--color-muted-foreground)] font-normal truncate">
                                    {member.role}
                                  </div>
                                </div>
                              </div>
                              {isAssigned && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-[var(--color-primary)]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. DESCRIPTION (Inline Editable, Save on Blur, Escape to cancel) */}
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

              {/* 5. COMMENTS SECTION */}
              <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
                  <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                    Comments ({comments.length})
                  </h3>
                </div>

                {/* Add Comment Composer (Ctrl/Cmd+Enter to send) */}
                <div className="space-y-2">
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Write a comment... (Ctrl+Enter to send)"
                    rows={2}
                    disabled={isSubmittingComment}
                    className="w-full text-sm p-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:border-[var(--color-primary)] focus:outline-none text-[var(--color-foreground)] shadow-[var(--shadow-sm)]"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-muted-foreground)]">
                      Tip: Press <kbd className="px-1 py-0.5 rounded bg-[var(--color-muted)] font-mono text-[10px]">Ctrl+Enter</kbd> to submit
                    </span>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAddComment}
                      isLoading={isSubmittingComment}
                      disabled={isSubmittingComment || !newCommentText.trim()}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                      className="cursor-pointer font-semibold shadow-[var(--shadow-sm)]"
                    >
                      Comment
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-3 pt-2">
                  {comments.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[var(--color-muted-foreground)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)]">
                      No comments yet. Be the first to share an update.
                    </div>
                  ) : (
                    comments.map((comment) => {
                      const isOwnComment = comment.userId === userId || (!comment.userId && !userId);
                      const isEditingThisComment = editingCommentId === comment.id;
                      const member = orgMembers.find((m) => m.id === comment.userId);
                      const authorName = isOwnComment
                        ? "You"
                        : member?.name || `User #${comment.userId.slice(0, 5)}`;

                      return (
                        <div
                          key={comment.id}
                          className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-2"
                        >
                          {/* Comment Header: Author & Timestamp */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar
                                name={authorName}
                                size="sm"
                                className="w-6 h-6 text-[10px]"
                              />
                              <span className="text-xs font-bold text-[var(--color-foreground)]">
                                {authorName}
                              </span>
                              <span className="text-[11px] text-[var(--color-muted-foreground)]">
                                • {formatRelativeTime(comment.createdAt)}
                              </span>
                            </div>

                            {/* Own comment action buttons: ONLY shown for author's own comments */}
                            {isOwnComment && !isEditingThisComment && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditComment(comment)}
                                  className="p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] rounded transition-colors cursor-pointer"
                                  title="Edit comment"
                                  aria-label="Edit comment"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={deletingCommentId === comment.id}
                                  className="p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 rounded transition-colors cursor-pointer"
                                  title="Delete comment"
                                  aria-label="Delete comment"
                                >
                                  {deletingCommentId === comment.id ? (
                                    <Spinner size="sm" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Comment Body */}
                          {isEditingThisComment ? (
                            <div className="space-y-2 pt-1">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") setEditingCommentId(null);
                                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditComment(comment.id);
                                  }
                                }}
                                rows={2}
                                className="w-full text-xs p-2 bg-[var(--color-card)] border border-[var(--color-primary)] rounded-[var(--radius-md)] focus:outline-none"
                              />
                              <div className="flex items-center justify-between text-[10px] text-[var(--color-muted-foreground)]">
                                <span>Press Ctrl+Enter to save • Esc to cancel</span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingCommentId(null)}
                                    disabled={isUpdatingComment}
                                    className="text-xs cursor-pointer"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleSaveEditComment(comment.id)}
                                    isLoading={isUpdatingComment}
                                    disabled={isUpdatingComment || !editingCommentText.trim()}
                                    className="text-xs cursor-pointer font-semibold"
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--color-foreground)] whitespace-pre-wrap leading-relaxed pl-8">
                              {comment.text}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ================= MODAL: DELETE ISSUE CONFIRMATION ================= */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Issue"
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingIssue}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handleDeleteIssueConfirm}
              isLoading={isDeletingIssue}
              disabled={isDeletingIssue}
              className="cursor-pointer font-semibold"
            >
              Delete Issue
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-foreground)]">
            Are you sure you want to delete{" "}
            <span className="font-bold text-[var(--color-destructive)]">
              "{issue?.title}"
            </span>
            ?
          </p>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-destructive)]/10 text-xs text-[var(--color-destructive)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This action cannot be undone. All comments on this card will be permanently deleted.</span>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default IssueDetailDrawer;
