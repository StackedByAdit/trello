import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Kanban,
  Plus,
  X,
  MoreVertical,
  Trash2,
  Edit2,
  Check,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getIssues,
  createIssue,
  moveIssue,
} from "../lib/api";
import type { Section, Issue } from "../lib/types";
import { useWorkspace } from "../context/WorkspaceContext";
import { useToast } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Dropdown, type DropdownItem } from "../components/ui/Dropdown";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { IssueDetailDrawer } from "../components/issue";

// User presence colors
const USER_COLORS = [
  "#0D9488",
  "#EA580C",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#10B981",
  "#F59E0B",
];

function getUserColor(userId: string | number): string {
  const str = String(userId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]!;
}

// ==========================================
// 1. Sortable Issue Card Component
// ==========================================
interface SortableIssueCardProps {
  issue: Issue;
  sectionId: string;
  onClick?: (issue: Issue) => void;
}

const SortableIssueCard: React.FC<SortableIssueCardProps> = ({
  issue,
  sectionId,
  onClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    data: {
      type: "Issue",
      issue,
      sectionId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-[var(--color-muted)] border-2 border-dashed border-[var(--color-primary)] rounded-[var(--radius-md)] p-3.5 min-h-[72px]"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      tabIndex={0}
      role="button"
      aria-label={`Issue: ${issue.title}`}
      onClick={(e) => {
        if (e.button !== 0) return;
        onClick?.(issue);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(issue);
        }
      }}
      className="group relative bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-primary)]/50 transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
    >
      <div className="text-sm font-medium text-[var(--color-foreground)] leading-snug line-clamp-3 mb-2.5">
        {issue.title}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)] pt-1">
        {/* Comment count */}
        <div className="flex items-center gap-1.5" title="Comments">
          <MessageSquare
            className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]"
            aria-hidden="true"
          />
          <span>{issue.comments?.length || 0}</span>
        </div>

        {/* Assignee Avatar */}
        <div className="flex items-center -space-x-1.5">
          <Avatar
            name={issue.title}
            size="sm"
            className="w-5 h-5 text-[10px] ring-1 ring-[var(--color-card)]"
          />
        </div>
      </div>
    </div>
  );
};

// Static preview of issue card for drag overlay
const DragOverlayCard: React.FC<{ issue: Issue }> = ({ issue }) => {
  return (
    <div className="bg-[var(--color-card)] border-2 border-[var(--color-primary)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-xl)] rotate-2 opacity-95 w-72 select-none pointer-events-none">
      <div className="text-sm font-semibold text-[var(--color-foreground)] leading-snug line-clamp-3 mb-2">
        {issue.title}
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)] pt-1">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{issue.comments?.length || 0}</span>
        </div>
        <Avatar name={issue.title} size="sm" className="w-5 h-5 text-[10px]" />
      </div>
    </div>
  );
};

// ==========================================
// 2. Board Column Component
// ==========================================
interface BoardColumnProps {
  section: Section;
  issues: Issue[];
  onRenameSection: (sectionId: string, title: string) => Promise<void>;
  onDeleteSectionClick: (section: Section) => void;
  onAddIssue: (sectionId: string, title: string) => Promise<void>;
  onIssueClick?: (issue: Issue) => void;
}

const BoardColumn: React.FC<BoardColumnProps> = ({
  section,
  issues,
  onRenameSection,
  onDeleteSectionClick,
  onAddIssue,
  onIssueClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: {
      type: "Section",
      section,
    },
  });

  // Section inline rename state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(section.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Inline add issue composer state
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const issueInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleValue(section.title);
  }, [section.title]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isAddingIssue) {
      issueInputRef.current?.focus();
    }
  }, [isAddingIssue]);

  const handleTitleSubmit = async () => {
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === section.title) {
      setTitleValue(section.title);
      setIsEditingTitle(false);
      return;
    }
    setIsEditingTitle(false);
    await onRenameSection(section.id, trimmed);
  };

  const handleIssueSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newIssueTitle.trim();
    if (!trimmed) return;

    setIsSubmittingIssue(true);
    try {
      await onAddIssue(section.id, trimmed);
      setNewIssueTitle("");
      setIsAddingIssue(false);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const dropdownItems: DropdownItem[] = [
    {
      id: "rename",
      label: "Rename list",
      icon: <Edit2 className="w-4 h-4" />,
      onClick: () => setIsEditingTitle(true),
    },
    {
      id: "delete",
      label: "Delete list",
      icon: <Trash2 className="w-4 h-4" />,
      destructive: true,
      onClick: () => onDeleteSectionClick(section),
    },
  ];

  return (
    <div
      className="w-72 sm:w-80 shrink-0 bg-[var(--color-card)]/80 border border-[var(--color-border)] rounded-[var(--radius-xl)] flex flex-col max-h-full shadow-[var(--shadow-sm)]"
      style={{ maxHeight: "calc(100vh - 10.5rem)" }}
    >
      {/* Column Header */}
      <div className="p-3.5 pb-2 flex items-center justify-between gap-2 border-b border-[var(--color-border)]/60">
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={titleInputRef}
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") {
                    setTitleValue(section.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full text-sm font-bold bg-[var(--color-card)] border border-[var(--color-primary)] rounded-[var(--radius-sm)] px-2 py-1 text-[var(--color-foreground)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTitleSubmit}
                className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded cursor-pointer"
                title="Save title"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-2 cursor-pointer group/title"
              title="Click to rename"
            >
              <h2 className="text-sm font-bold text-[var(--color-foreground)] truncate group-hover/title:text-[var(--color-primary)] transition-colors">
                {section.title}
              </h2>
              <Badge variant="outline" size="sm" className="px-1.5 py-0 text-[11px] font-semibold">
                {issues.length}
              </Badge>
            </div>
          )}
        </div>

        <Dropdown
          align="right"
          items={dropdownItems}
          trigger={({ isOpen }) => (
            <button
              type="button"
              aria-label={`Options for ${section.title}`}
              className={`p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                isOpen ? "bg-[var(--color-muted)] text-[var(--color-foreground)]" : ""
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        />
      </div>

      {/* Issues Droppable Area */}
      <SortableContext
        items={issues.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`p-2.5 flex-1 overflow-y-auto space-y-2.5 min-h-[90px] transition-colors scrollbar-thin ${
            isOver
              ? "bg-[var(--color-primary)]/5 ring-2 ring-inset ring-[var(--color-primary)]/40 rounded-[var(--radius-lg)]"
              : ""
          }`}
        >
          {issues.map((issue) => (
            <SortableIssueCard
              key={issue.id}
              issue={issue}
              sectionId={section.id}
              onClick={onIssueClick}
            />
          ))}

          {issues.length === 0 && !isOver && (
            <div className="h-16 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)] text-xs text-[var(--color-muted-foreground)]">
              No issues here yet
            </div>
          )}
        </div>
      </SortableContext>

      {/* Column Footer / Add Issue Composer */}
      <div className="p-2.5 pt-1 border-t border-[var(--color-border)]/40">
        {isAddingIssue ? (
          <form onSubmit={handleIssueSubmit} className="space-y-2 animate-in fade-in">
            <input
              ref={issueInputRef}
              type="text"
              placeholder="Enter issue title..."
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsAddingIssue(false);
                  setNewIssueTitle("");
                }
              }}
              disabled={isSubmittingIssue}
              className="w-full text-sm p-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:border-[var(--color-primary)] focus:outline-none text-[var(--color-foreground)] shadow-[var(--shadow-sm)]"
            />
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingIssue}
                disabled={isSubmittingIssue || !newIssueTitle.trim()}
                className="cursor-pointer font-semibold shadow-[var(--shadow-sm)]"
              >
                Add Issue
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsAddingIssue(false);
                  setNewIssueTitle("");
                }}
                disabled={isSubmittingIssue}
                className="cursor-pointer text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingIssue(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] rounded-[var(--radius-md)] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Add issue</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. Main BoardPage Component
// ==========================================
export const BoardPage: React.FC = () => {
  const { boardId, issueId } = useParams<{ boardId: string; issueId?: string }>();
  const navigate = useNavigate();
  const { boards } = useWorkspace();
  const { toast } = useToast();

  const currentBoard = boards.find((b) => b.id === boardId);

  // Close drawer handler
  const handleCloseDrawer = useCallback(() => {
    if (boardId) {
      navigate(`/board/${boardId}`);
    }
  }, [boardId, navigate]);

  const isDraggingRef = useRef(false);

  const handleIssueClick = useCallback(
    (clickedIssue: Issue) => {
      if (isDraggingRef.current) return;
      if (boardId) {
        navigate(`/board/${boardId}/issue/${clickedIssue.id}`);
      }
    },
    [boardId, navigate]
  );

  const handleIssueUpdated = useCallback((updated: Issue | IssueWithComments) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
    );
  }, []);

  const handleIssueMovedFromDrawer = useCallback(
    (movedIssueId: string, targetSectionId: string) => {
      setIssues((prev) =>
        prev.map((i) =>
          i.id === movedIssueId ? { ...i, sectionId: targetSectionId } : i
        )
      );
    },
    []
  );

  // Sections & Issues State
  const [sections, setSections] = useState<Section[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active Dragging Issue
  const [activeDragIssue, setActiveDragIssue] = useState<Issue | null>(null);
  const dragSourceSectionId = useRef<string | null>(null);

  // Section Deletion State
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<Section | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState(false);

  // Add Section Column State
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);
  const newSectionInputRef = useRef<HTMLInputElement>(null);

  // WebSocket Presence & Reconnect State
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [activeUsers, setActiveUsers] = useState<(string | number)[]>([]);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // dnd-kit Sensors (Pointer, Touch, Keyboard)
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  // Focus add section input
  useEffect(() => {
    if (isAddingSection) {
      newSectionInputRef.current?.focus();
    }
  }, [isAddingSection]);

  // Load Sections and Issues
  const loadBoardData = useCallback(async () => {
    if (!boardId) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      const [fetchedSections, fetchedIssues] = await Promise.all([
        getSections(boardId),
        getIssues(boardId),
      ]);

      // If a board has no sections, create default "Upcoming", "In progress", "Done"
      if (!fetchedSections || fetchedSections.length === 0) {
        const defaultTitles = ["Upcoming", "In progress", "Done"];
        const createdDefaults: Section[] = [];
        for (let i = 0; i < defaultTitles.length; i++) {
          const s = await createSection({
            title: defaultTitles[i]!,
            boardId,
            order: i,
          });
          createdDefaults.push(s);
        }
        setSections(createdDefaults);
      } else {
        setSections(fetchedSections.sort((a, b) => a.order - b.order));
      }

      setIssues(fetchedIssues || []);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Failed to load board data";
      setLoadError(msg);
      toast({
        title: "Could not load board",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [boardId, toast]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  // WebSocket Connection with Backoff Reconnect
  useEffect(() => {
    if (!boardId) return;

    let isMounted = true;

    const connectWebSocket = () => {
      if (!isMounted) return;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      const wsUrl =
        (typeof process !== "undefined" && process.env?.BUN_PUBLIC_WS_URL) ||
        "ws://localhost:8080";

      setWsStatus("connecting");

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) {
            ws.close();
            return;
          }
          reconnectAttempts.current = 0;
          setWsStatus("connected");
          ws.send(JSON.stringify({ type: "join", boardId }));
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data?.type === "initial_state") {
              setActiveUsers(data.users || []);
            } else if (data?.type === "join" && data.userId !== undefined) {
              setActiveUsers((prev) =>
                prev.includes(data.userId) ? prev : [...prev, data.userId]
              );
            } else if (data?.type === "leave" && data.userId !== undefined) {
              setActiveUsers((prev) => prev.filter((id) => id !== data.userId));
            }
          } catch {
            // Ignore non-json payload
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsStatus("disconnected");
          scheduleReconnect();
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setWsStatus("disconnected");
          ws.close();
        };
      } catch {
        if (!isMounted) return;
        setWsStatus("disconnected");
        scheduleReconnect();
      }
    };

    const scheduleReconnect = () => {
      reconnectAttempts.current += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 15000);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, delay);
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [boardId]);

  // Section Handlers
  const handleRenameSection = async (sectionId: string, title: string) => {
    const prevSections = [...sections];
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );

    try {
      await updateSection({ sectionId, title });
      toast({
        title: "List renamed",
        description: `Renamed to "${title}".`,
        variant: "success",
        duration: 2000,
      });
    } catch (err: any) {
      setSections(prevSections);
      toast({
        title: "Could not rename list",
        description: err?.message || "Failed to update section",
        variant: "error",
      });
    }
  };

  const handleDeleteSectionConfirm = async () => {
    if (!deleteSectionTarget) return;

    const targetId = deleteSectionTarget.id;
    const prevSections = [...sections];
    const prevIssues = [...issues];

    // Optimistically remove
    setSections((prev) => prev.filter((s) => s.id !== targetId));
    setIssues((prev) => prev.filter((i) => i.sectionId !== targetId));
    setIsDeletingSection(true);

    try {
      await deleteSection(targetId);
      toast({
        title: "List deleted",
        description: `"${deleteSectionTarget.title}" was removed.`,
        variant: "success",
      });
      setDeleteSectionTarget(null);
    } catch (err: any) {
      setSections(prevSections);
      setIssues(prevIssues);
      toast({
        title: "Could not delete list",
        description: err?.message || "Failed to delete section",
        variant: "error",
      });
    } finally {
      setIsDeletingSection(false);
    }
  };

  const handleAddSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId) return;

    const trimmed = newSectionTitle.trim();
    if (!trimmed) return;

    setIsSubmittingSection(true);
    try {
      const created = await createSection({
        title: trimmed,
        boardId,
        order: sections.length,
      });
      setSections((prev) => [...prev, created]);
      setNewSectionTitle("");
      setIsAddingSection(false);
      toast({
        title: "List created",
        description: `"${created.title}" added to the board.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Could not create list",
        description: err?.message || "Failed to add section",
        variant: "error",
      });
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const handleAddIssue = async (sectionId: string, title: string) => {
    if (!boardId) return;

    try {
      const created = await createIssue({
        title,
        boardId,
        sectionId,
      });
      setIssues((prev) => [...prev, created]);
      toast({
        title: "Issue added",
        description: `"${created.title}" created.`,
        variant: "success",
        duration: 2500,
      });
    } catch (err: any) {
      toast({
        title: "Could not create issue",
        description: err?.message || "Failed to add issue",
        variant: "error",
      });
      throw err;
    }
  };

  // Drag and drop event handlers
  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    const { active } = event;
    const issue = issues.find((i) => i.id === active.id);
    if (issue) {
      setActiveDragIssue(issue);
      dragSourceSectionId.current = issue.sectionId;
    }
  };

  const handleDragCancel = () => {
    setActiveDragIssue(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeIssue = issues.find((i) => i.id === activeId);
    if (!activeIssue) return;

    // Determine target section
    let targetSectionId: string | null = null;
    const overData = over.data.current;

    if (overData?.type === "Section") {
      targetSectionId = overData.section.id;
    } else if (overData?.type === "Issue") {
      targetSectionId = overData.sectionId;
    } else {
      // Check if overId directly matches a section
      const sectionMatch = sections.find((s) => s.id === overId);
      if (sectionMatch) targetSectionId = sectionMatch.id;
    }

    if (!targetSectionId || activeIssue.sectionId === targetSectionId) return;

    // Optimistically reassign to new column during hover
    setIssues((prev) =>
      prev.map((i) => (i.id === activeId ? { ...i, sectionId: targetSectionId! } : i))
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);

    setActiveDragIssue(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);

    if (!over) {
      // If dropped outside, revert to source section
      if (dragSourceSectionId.current) {
        setIssues((prev) =>
          prev.map((i) =>
            i.id === activeId ? { ...i, sectionId: dragSourceSectionId.current! } : i
          )
        );
      }
      return;
    }

    const overId = String(over.id);
    const sourceSection = dragSourceSectionId.current;

    let targetSectionId: string | null = null;
    const overData = over.data.current;

    if (overData?.type === "Section") {
      targetSectionId = overData.section.id;
    } else if (overData?.type === "Issue") {
      targetSectionId = overData.sectionId;
    } else {
      const sectionMatch = sections.find((s) => s.id === overId);
      if (sectionMatch) targetSectionId = sectionMatch.id;
    }

    if (!targetSectionId) return;

    // Moving between columns
    if (sourceSection && sourceSection !== targetSectionId) {
      const snapshot = [...issues];
      try {
        await moveIssue({
          issueId: activeId,
          sectionId: targetSectionId,
        });
        toast({
          title: "Card moved",
          description: "Issue position synced.",
          variant: "success",
          duration: 2000,
        });
      } catch (err: any) {
        // Roll back on failure to prevent optimistic bugs
        setIssues(snapshot);
        toast({
          title: "Could not move card",
          description: err?.message || "Failed to move issue",
          variant: "error",
        });
      }
    } else {
      // Reordering within the same column
      const oldIndex = issues.findIndex((i) => i.id === activeId);
      const newIndex = issues.findIndex((i) => i.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setIssues((items) => arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  const boardTitle = currentBoard?.title || `Board #${boardId?.slice(0, 6)}`;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[var(--color-background)]">
      {/* ================= BOARD HEADER ================= */}
      <div className="h-14 px-4 sm:px-6 bg-[var(--color-card)]/80 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0 backdrop-blur-xs">
        {/* Left: Back Link + Board Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/dashboard"
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
            <Kanban className="w-4 h-4" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-foreground)] truncate">
            {boardTitle}
          </h1>
        </div>

        {/* Right: Presence Avatars + Real-time Socket Indicator */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Avatar stack ("who is on this board") */}
          <div
            className="flex items-center -space-x-2"
            title={`Active on this board: ${
              activeUsers.length === 0
                ? "You"
                : `${activeUsers.length + 1} users online`
            }`}
          >
            {/* Self Avatar */}
            <div className="relative" title="You (online)">
              <Avatar
                name="You"
                size="sm"
                status="online"
                className="w-7 h-7 text-xs border-2 border-[var(--color-card)]"
              />
            </div>

            {/* Other Online Users */}
            {activeUsers.slice(0, 3).map((uid, idx) => {
              const color = getUserColor(uid);
              return (
                <div
                  key={`user-${idx}`}
                  style={{ backgroundColor: color }}
                  className="w-7 h-7 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--color-card)] shadow-xs"
                  title={`Active User #${String(uid).slice(2, 6)}`}
                >
                  {String(uid).slice(2, 4) || "U"}
                </div>
              );
            })}

            {activeUsers.length > 3 && (
              <span className="w-7 h-7 rounded-full bg-[var(--color-muted)] text-[var(--color-foreground)] text-[10px] font-bold flex items-center justify-center border-2 border-[var(--color-card)]">
                +{activeUsers.length - 3}
              </span>
            )}
          </div>

          {/* Connection Status Indicator */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-full)] bg-[var(--color-muted)] text-xs font-medium"
            title={
              wsStatus === "connected"
                ? "Live real-time sync connected"
                : wsStatus === "connecting"
                ? "Connecting to real-time sync..."
                : "Disconnected. Reconnecting with backoff..."
            }
          >
            {wsStatus === "connected" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                  Live
                </span>
                <Wifi className="w-3.5 h-3.5 text-emerald-500 sm:hidden" />
              </>
            ) : wsStatus === "connecting" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="hidden sm:inline text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                  Connecting...
                </span>
                <Wifi className="w-3.5 h-3.5 text-amber-500 animate-pulse sm:hidden" />
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="hidden sm:inline text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                  Offline
                </span>
                <WifiOff className="w-3.5 h-3.5 text-rose-500 sm:hidden" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================= MAIN BOARD KANBAN AREA ================= */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center gap-3 text-sm text-[var(--color-muted-foreground)]">
          <Spinner size="md" />
          <span>Loading board columns and issues...</span>
        </div>
      ) : loadError ? (
        <div className="p-8 max-w-lg mx-auto text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-[var(--color-destructive)] mx-auto" />
          <h2 className="text-base font-bold text-[var(--color-foreground)]">
            Could not load board
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {loadError}
          </p>
          <Button variant="secondary" size="sm" onClick={loadBoardData}>
            Retry
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6 flex flex-row items-start gap-4 sm:gap-6 min-h-0 scrollbar-thin">
            {/* Render Columns */}
            {sections.map((section) => {
              const columnIssues = issues.filter(
                (issue) => issue.sectionId === section.id
              );
              return (
                <BoardColumn
                  key={section.id}
                  section={section}
                  issues={columnIssues}
                  onRenameSection={handleRenameSection}
                  onDeleteSectionClick={(s) => setDeleteSectionTarget(s)}
                  onAddIssue={handleAddIssue}
                  onIssueClick={handleIssueClick}
                />
              );
            })}

            {/* "Add Section" Column at the End */}
            <div className="w-72 sm:w-80 shrink-0">
              {isAddingSection ? (
                <div className="bg-[var(--color-card)] border border-[var(--color-primary)] rounded-[var(--radius-xl)] p-3.5 shadow-[var(--shadow-md)] animate-in fade-in space-y-3">
                  <input
                    ref={newSectionInputRef}
                    type="text"
                    placeholder="Enter list title..."
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSectionSubmit(e);
                      if (e.key === "Escape") {
                        setIsAddingSection(false);
                        setNewSectionTitle("");
                      }
                    }}
                    disabled={isSubmittingSection}
                    className="w-full text-sm font-semibold p-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:border-[var(--color-primary)] focus:outline-none text-[var(--color-foreground)]"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAddSectionSubmit}
                      isLoading={isSubmittingSection}
                      disabled={isSubmittingSection || !newSectionTitle.trim()}
                      className="cursor-pointer font-semibold shadow-[var(--shadow-sm)]"
                    >
                      Add List
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setIsAddingSection(false);
                        setNewSectionTitle("");
                      }}
                      disabled={isSubmittingSection}
                      className="cursor-pointer text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingSection(true)}
                  className="w-full p-3.5 bg-[var(--color-card)]/50 hover:bg-[var(--color-card)] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/60 rounded-[var(--radius-xl)] flex items-center justify-center gap-2 text-sm font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-all cursor-pointer shadow-[var(--shadow-xs)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add another list</span>
                </button>
              )}
            </div>
          </div>

          {/* Drag Overlay Clone */}
          <DragOverlay>
            {activeDragIssue ? (
              <DragOverlayCard issue={activeDragIssue} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ================= MODAL: CONFIRM DELETE SECTION ================= */}
      <Modal
        isOpen={deleteSectionTarget !== null}
        onClose={() => setDeleteSectionTarget(null)}
        title="Delete List"
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteSectionTarget(null)}
              disabled={isDeletingSection}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSectionConfirm}
              isLoading={isDeletingSection}
              disabled={isDeletingSection}
              className="cursor-pointer font-semibold"
            >
              Delete List
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-foreground)]">
            Are you sure you want to delete{" "}
            <span className="font-bold text-[var(--color-destructive)]">
              "{deleteSectionTarget?.title}"
            </span>
            ?
          </p>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-destructive)]/10 text-xs text-[var(--color-destructive)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>All issues in this column will be permanently removed.</span>
          </div>
        </div>
      </Modal>

      {/* ================= ISSUE DETAIL DRAWER ================= */}
      {issueId && boardId && (
        <IssueDetailDrawer
          boardId={boardId}
          issueId={issueId}
          sections={sections}
          initialIssue={issues.find((i) => i.id === issueId)}
          onClose={handleCloseDrawer}
          onIssueUpdated={handleIssueUpdated}
          onIssueMoved={handleIssueMovedFromDrawer}
        />
      )}
    </div>
  );
};

export default BoardPage;
