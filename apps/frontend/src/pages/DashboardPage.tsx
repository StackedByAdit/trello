import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Kanban,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  FolderPlus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import type { Board } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Dropdown, type DropdownItem } from "../components/ui/Dropdown";
import { Badge } from "../components/ui/Badge";

// Palette generator for board cards accent bar
const BOARD_ACCENT_COLORS = [
  "#0D9488", // Teal Primary
  "#14B8A6", // Teal Secondary
  "#EA580C", // Orange Accent
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#10B981", // Emerald
  "#F59E0B", // Amber
];

function getBoardColor(boardId: string): string {
  let hash = 0;
  for (let i = 0; i < boardId.length; i++) {
    hash = boardId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BOARD_ACCENT_COLORS.length;
  return BOARD_ACCENT_COLORS[index]!;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Recently created";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently created";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently created";
  }
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeOrg,
    boards,
    isLoadingBoards,
    isLoadingOrgs,
    boardsError,
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    isCreateBoardModalOpen,
    openCreateBoardModal,
    closeCreateBoardModal,
  } = useWorkspace();

  // Local state for modals
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState<Board | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handlers
  const handleOpenCreateModal = () => {
    setNewBoardTitle("");
    setCreateError(null);
    openCreateBoardModal();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBoardTitle.trim();
    if (!trimmed) {
      setCreateError("Board title is required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await createBoard(trimmed);
      closeCreateBoardModal();
      setNewBoardTitle("");
      // Navigate to the newly created board
      navigate(`/board/${created.id}`);
    } catch (err: any) {
      setCreateError(
        err?.data?.message || err?.message || "Failed to create board"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenRename = (board: Board) => {
    setRenameTarget(board);
    setRenameTitle(board.title);
    setRenameError(null);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;

    const trimmed = renameTitle.trim();
    if (!trimmed) {
      setRenameError("Board title cannot be empty");
      return;
    }

    setIsRenaming(true);
    setRenameError(null);
    try {
      await updateBoard(renameTarget.id, trimmed);
      setRenameTarget(null);
    } catch (err: any) {
      setRenameError(
        err?.data?.message || err?.message || "Failed to update board"
      );
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteBoard(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Toast and rollback handled in context
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isLoadingBoards || isLoadingOrgs;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ================= HEADER SECTION ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-foreground)] tracking-tight">
              {activeOrg ? activeOrg.name : "Your Workspace"}
            </h1>
            {activeOrg && (
              <Badge variant="secondary" size="sm">
                Active Org
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {activeOrg?.description ||
              "Manage projects, track issues, and collaborate with your team across Kanban boards."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
            className="cursor-pointer shadow-[var(--shadow-sm)] font-semibold"
          >
            Create Board
          </Button>
        </div>
      </div>

      {/* ================= CONTENT STATES ================= */}

      {/* 1. SKELETON LOADING STATE */}
      {isLoading && (
        <div
          role="status"
          aria-label="Loading boards"
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-[var(--color-muted)] rounded-[var(--radius-sm)] animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={`skeleton-${idx}`}
                className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 min-h-[140px] flex flex-col justify-between shadow-[var(--shadow-sm)] animate-pulse"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-6 h-1.5 rounded-full bg-[var(--color-muted)]" />
                    <div className="w-5 h-5 rounded-full bg-[var(--color-muted)]" />
                  </div>
                  <div className="h-5 w-3/4 bg-[var(--color-muted)] rounded-[var(--radius-sm)] mb-2" />
                  <div className="h-3 w-1/2 bg-[var(--color-muted)]/70 rounded-[var(--radius-sm)]" />
                </div>
                <div className="h-3.5 w-1/3 bg-[var(--color-muted)]/60 rounded-[var(--radius-sm)] mt-4" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ERROR STATE WITH RETRY */}
      {!isLoading && boardsError && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-6 sm:p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--color-foreground)]">
              Unable to load boards
            </h3>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              {boardsError}
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => fetchBoards()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            className="cursor-pointer font-medium mx-auto"
          >
            Retry Loading Boards
          </Button>
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!isLoading && !boardsError && boards.length === 0 && (
        <div className="rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-card)]/40 p-8 sm:p-12 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] mx-auto flex items-center justify-center mb-4 shadow-[var(--shadow-sm)]">
            <FolderPlus className="w-7 h-7" aria-hidden="true" />
          </div>
          <Badge variant="accent" size="sm" className="mb-2">
            <Sparkles className="w-3 h-3 mr-1" /> Ready for Your First Board
          </Badge>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)] tracking-tight">
            No boards in this workspace yet
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1.5 max-w-md mx-auto leading-relaxed">
            Create a board to manage tasks, collaborate in real time, and organize issues across flexible Kanban stages.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreateModal}
              leftIcon={<Plus className="w-4 h-4" />}
              className="cursor-pointer shadow-[var(--shadow-sm)] font-semibold"
            >
              Create your first board
            </Button>
          </div>
        </div>
      )}

          </div>
  );
};

export default DashboardPage;
