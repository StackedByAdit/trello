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

      {/* 4. GRID OF BOARD CARDS */}
      {!isLoading && !boardsError && boards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Workspace Boards ({boards.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {boards.map((board) => {
              const accentColor = getBoardColor(board.id);

              const cardMenuItems: DropdownItem[] = [
                {
                  id: "rename",
                  label: "Rename Board",
                  icon: <Edit2 className="w-4 h-4" />,
                  onClick: () => handleOpenRename(board),
                },
                {
                  id: "delete",
                  label: "Delete Board",
                  icon: <Trash2 className="w-4 h-4" />,
                  destructive: true,
                  onClick: () => setDeleteTarget(board),
                },
              ];

              return (
                <div
                  key={board.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/board/${board.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/board/${board.id}`);
                    }
                  }}
                  className="group relative bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 sm:p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] select-none"
                  aria-label={`Open board: ${board.title}`}
                >
                  {/* Top Bar: Accent color chip + Dropdown Menu */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-8 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: accentColor }}
                      aria-hidden="true"
                    />

                    {/* Context Menu Button */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Dropdown
                        align="right"
                        items={cardMenuItems}
                        trigger={({ isOpen }) => (
                          <button
                            type="button"
                            aria-label={`Options for ${board.title}`}
                            className={`p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                              isOpen ? "bg-[var(--color-muted)] text-[var(--color-foreground)]" : ""
                            }`}
                          >
                            <MoreVertical className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      />
                    </div>
                  </div>

                  {/* Board Title */}
                  <div className="my-2">
                    <h3 className="font-bold text-base text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 leading-snug">
                      {board.title}
                    </h3>
                  </div>

                  {/* Bottom Row: Created Date + Hover Arrow */}
                  <div className="pt-2 border-t border-[var(--color-border)]/50 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{formatDate(board.createdAt)}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-[var(--color-primary)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MODAL 1: CREATE BOARD ================= */}
      <Modal
        isOpen={isCreateBoardModalOpen}
        onClose={closeCreateBoardModal}
        title="Create New Board"
        description={
          activeOrg
            ? `Add a new Kanban board to ${activeOrg.name}.`
            : "Add a new Kanban board."
        }
        maxWidth="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={closeCreateBoardModal}
              disabled={isCreating}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-board-form"
              variant="primary"
              size="md"
              isLoading={isCreating}
              disabled={isCreating || !newBoardTitle.trim()}
              className="cursor-pointer font-semibold shadow-[var(--shadow-sm)]"
            >
              Create Board
            </Button>
          </>
        }
      >
        <form id="create-board-form" onSubmit={handleCreateSubmit} noValidate>
          <Input
            id="new-board-title"
            name="title"
            label="Board Title"
            placeholder="e.g. Sprint Backlog, Product Launch, or QA"
            value={newBoardTitle}
            onChange={(e) => {
              setNewBoardTitle(e.target.value);
              if (createError) setCreateError(null);
            }}
            error={createError || undefined}
            autoFocus
            required
            disabled={isCreating}
            leftIcon={<Kanban className="w-4 h-4" aria-hidden="true" />}
          />
        </form>
      </Modal>

      {/* ================= MODAL 2: RENAME BOARD ================= */}
      <Modal
        isOpen={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Rename Board"
        description="Update the title for this board."
        maxWidth="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setRenameTarget(null)}
              disabled={isRenaming}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="rename-board-form"
              variant="primary"
              size="md"
              isLoading={isRenaming}
              disabled={isRenaming || !renameTitle.trim()}
              className="cursor-pointer font-semibold shadow-[var(--shadow-sm)]"
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form id="rename-board-form" onSubmit={handleRenameSubmit} noValidate>
          <Input
            id="rename-board-title"
            name="title"
            label="Board Title"
            value={renameTitle}
            onChange={(e) => {
              setRenameTitle(e.target.value);
              if (renameError) setRenameError(null);
            }}
            error={renameError || undefined}
            autoFocus
            required
            disabled={isRenaming}
            leftIcon={<Kanban className="w-4 h-4" aria-hidden="true" />}
          />
        </form>
      </Modal>

      {/* ================= MODAL 3: DELETE BOARD CONFIRMATION ================= */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Board"
        maxWidth="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handleDeleteSubmit}
              isLoading={isDeleting}
              disabled={isDeleting}
              className="cursor-pointer font-semibold"
            >
              Delete Board
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-foreground)]">
            Are you sure you want to delete{" "}
            <span className="font-bold text-[var(--color-destructive)]">
              "{deleteTarget?.title}"
            </span>
            ?
          </p>
          <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/20 text-xs text-[var(--color-destructive)] space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Warning: This action cannot be undone.</span>
            </div>
            <p className="text-[var(--color-foreground)]/80">
              All columns, issues, task descriptions, and comments within this board will be permanently removed.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardPage;
