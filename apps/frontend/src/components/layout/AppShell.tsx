import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  Kanban,
  Building2,
  ChevronDown,
  Plus,
  LayoutDashboard,
  Users,
  Settings,
  Sun,
  Moon,
  Laptop,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Check,
  FolderKanban,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../auth";
import { useWorkspace } from "../../context/WorkspaceContext";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Dropdown, type DropdownItem } from "../ui/Dropdown";

const BOARD_ACCENT_COLORS = [
  "#0D9488",
  "#14B8A6",
  "#EA580C",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#10B981",
  "#F59E0B",
];

function getBoardColor(boardId: string): string {
  let hash = 0;
  for (let i = 0; i < boardId.length; i++) {
    hash = boardId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BOARD_ACCENT_COLORS[Math.abs(hash) % BOARD_ACCENT_COLORS.length]!;
}

export interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, actualTheme, toggleTheme } = useTheme();
  const { logout, userId } = useAuth();
  const navigate = useNavigate();

  const {
    organizations,
    activeOrg,
    setActiveOrg,
    boards,
    isLoadingBoards,
    openCreateBoardModal,
  } = useWorkspace();

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  const orgDropdownItems: DropdownItem[] = [
    ...organizations.map((org) => ({
      id: org.id,
      label: (
        <div className="flex items-center justify-between w-full">
          <span className="truncate">{org.name}</span>
          {activeOrg?.id === org.id && (
            <Check className="w-4 h-4 text-[var(--color-primary)] ml-2 shrink-0" />
          )}
        </div>
      ),
      icon: (
        <Building2 className="w-4 h-4 text-[var(--color-muted-foreground)]" />
      ),
      onClick: () => {
        setActiveOrg(org);
        setIsSidebarOpen(false);
      },
    })),
    { divider: true, label: "" },
    {
      id: "new-org",
      label: "Create Organization",
      icon: <Plus className="w-4 h-4 text-[var(--color-primary)]" />,
      onClick: () => {
        setIsSidebarOpen(false);
        navigate("/onboarding");
      },
    },
  ];

  const userDropdownItems: DropdownItem[] = [
    {
      id: "profile",
      label: (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-[var(--color-foreground)]">
            Account User
          </span>
          <span className="text-[11px] text-[var(--color-muted-foreground)] truncate max-w-[150px]">
            {userId ? `ID: ${userId.slice(0, 8)}...` : "Logged in"}
          </span>
        </div>
      ),
      onClick: () => {},
    },
    { divider: true, label: "" },
    {
      id: "all-boards",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      onClick: () => navigate("/dashboard"),
    },
    {
      id: "create-org",
      label: "Create Workspace",
      icon: <Plus className="w-4 h-4" />,
      onClick: () => navigate("/onboarding"),
    },
    { divider: true, label: "" },
    {
      id: "sign-out",
      label: "Sign Out",
      destructive: true,
      icon: <LogOut className="w-4 h-4" />,
      onClick: () => logout(),
    },
  ];

  const themeIcon =
    theme === "system" ? (
      <Laptop className="w-4 h-4" aria-hidden="true" />
    ) : actualTheme === "dark" ? (
      <Moon className="w-4 h-4 text-teal-400" aria-hidden="true" />
    ) : (
      <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
    );

  const themeLabel =
    theme === "system"
      ? `System Theme (${actualTheme})`
      : `${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme`;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)] font-sans antialiased selection:bg-[var(--color-primary)] selection:text-[var(--color-on-primary)]">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="sticky top-0 z-30 h-14 w-full bg-[var(--color-card)] border-b border-[var(--color-border)] px-3 sm:px-4 flex items-center justify-between gap-2 shadow-[var(--shadow-sm)]">
        {/* Left Side: Mobile Menu Button + Brand Logo + Top Bar Org Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile hamburger toggle button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </Button>

          {/* Logo & Brand Name */}
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded-[var(--radius-sm)]"
          >
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center shadow-[var(--shadow-sm)]">
              <Kanban className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-[var(--color-foreground)]">
              Trello
            </span>
            <Badge
              variant="accent"
              size="sm"
              className="hidden sm:inline-flex ml-1"
            >
              Pro
            </Badge>
          </NavLink>

          {/* Org Switcher Dropdown in the Top Bar */}
          <div className="hidden sm:flex items-center ml-2 pl-2 sm:pl-3 border-l border-[var(--color-border)]">
            <Dropdown
              align="left"
              items={orgDropdownItems}
              trigger={({ isOpen }) => (
                <button
                  type="button"
                  aria-label="Switch active organization"
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] transition-colors duration-150 cursor-pointer text-left text-xs font-semibold max-w-[210px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                    isOpen ? "ring-2 ring-[var(--color-ring)]/40" : ""
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                  <span className="truncate flex-1">
                    {activeOrg ? activeOrg.name : "Select Workspace"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--color-muted-foreground)] shrink-0 ml-1" />
                </button>
              )}
            />
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden md:flex items-center max-w-sm w-full mx-4">
          <div className="relative w-full flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-[var(--color-muted-foreground)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search boards, cards, issues..."
              className="w-full pl-9 pr-12 py-1.5 bg-[var(--color-muted)] text-sm rounded-[var(--radius-md)] border border-transparent focus:border-[var(--color-primary)] focus:bg-[var(--color-card)] focus:outline-none transition-all duration-200 placeholder:text-[var(--color-muted-foreground)]/80 text-[var(--color-foreground)]"
            />
            <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-muted-foreground)] bg-[var(--color-card)] border border-[var(--color-border)] rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Side: Theme Toggle, Notifications, User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={`Toggle theme (currently ${themeLabel})`}
            title={`Current theme: ${themeLabel}. Click to toggle.`}
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            {themeIcon}
          </Button>

          {/* Notification Button */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="View notifications"
            className="relative text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-card)]" />
          </Button>

          {/* User Profile Dropdown */}
          <Dropdown
            align="right"
            items={userDropdownItems}
            trigger={({ isOpen }) => (
              <button
                type="button"
                aria-label="Open user menu"
                className={`flex items-center gap-1.5 p-1 rounded-full hover:bg-[var(--color-muted)] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                  isOpen ? "bg-[var(--color-muted)]" : ""
                }`}
              >
                <Avatar name="User" size="sm" status="online" />
                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-muted-foreground)] hidden sm:block mr-0.5" />
              </button>
            )}
          />
        </div>
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* ================= MOBILE DRAWER BACKDROP ================= */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-200 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ================= LEFT SIDEBAR (DRAWER ON MOBILE) ================= */}
        <aside
          className={`fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-auto w-64 sm:w-72 lg:w-64 bg-[var(--color-card)] border-r border-[var(--color-border)] flex flex-col transition-transform duration-200 ease-in-out shrink-0
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          {/* Mobile Drawer Header (close button) */}
          <div className="lg:hidden flex items-center justify-between p-3.5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center">
                <Kanban className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm">Trello</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5 text-[var(--color-muted-foreground)]" />
            </Button>
          </div>

          {/* Org Switcher Header in Sidebar */}
          <div className="p-3 border-b border-[var(--color-border)]">
            <Dropdown
              align="left"
              items={orgDropdownItems}
              className="w-full"
              trigger={({ isOpen }) => (
                <button
                  type="button"
                  aria-label="Switch organization"
                  className={`w-full flex items-center justify-between p-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] transition-colors duration-150 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                    isOpen ? "ring-2 ring-[var(--color-ring)]/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate text-[var(--color-foreground)]">
                        {activeOrg ? activeOrg.name : "No Workspace"}
                      </div>
                      <div className="text-[10px] text-[var(--color-muted-foreground)] font-medium">
                        {activeOrg ? "Active Workspace" : "Select workspace"}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--color-muted-foreground)] shrink-0 ml-1" />
                </button>
              )}
            />
          </div>

          {/* Sidebar Navigation & Boards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin">
            {/* Primary Section */}
            <div className="space-y-1">
              <NavLink
                to="/dashboard"
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                    isActive
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>All Boards</span>
              </NavLink>

              <NavLink
                to="/members"
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                    isActive
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                  }`
                }
              >
                <Users className="w-4 h-4" />
                <span>Members</span>
              </NavLink>

              <NavLink
                to="/settings"
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                    isActive
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                  }`
                }
              >
                <Settings className="w-4 h-4" />
                <span>Org Settings</span>
              </NavLink>
            </div>

            {/* Boards Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Your Boards ({boards.length})
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openCreateBoardModal}
                  aria-label="Create new board"
                  title="Create new board"
                  className="w-6 h-6 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {isLoadingBoards ? (
                <div className="space-y-1.5 px-2 py-1">
                  <div className="h-6 w-full bg-[var(--color-muted)] rounded-[var(--radius-sm)] animate-pulse" />
                  <div className="h-6 w-3/4 bg-[var(--color-muted)] rounded-[var(--radius-sm)] animate-pulse" />
                </div>
              ) : boards.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-[var(--color-muted-foreground)] bg-[var(--color-muted)]/30 rounded-[var(--radius-md)]">
                  <p>No boards created yet.</p>
                  <button
                    type="button"
                    onClick={openCreateBoardModal}
                    className="mt-1 text-[var(--color-primary)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Create a board
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {boards.map((board) => {
                    const boardColor = getBoardColor(board.id);
                    return (
                      <NavLink
                        key={board.id}
                        to={`/board/${board.id}`}
                        onClick={() => setIsSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 text-sm rounded-[var(--radius-md)] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                            isActive
                              ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-semibold"
                              : "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                          }`
                        }
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: boardColor }}
                          aria-hidden="true"
                        />
                        <span className="truncate flex-1">{board.title}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Footer with Quick Status */}
          <div className="p-3 border-t border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)] flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Workspace Sync</span>
            </span>
            <span
              className="w-2 h-2 rounded-full bg-emerald-500"
              title="Online"
            />
          </div>
        </aside>

        {/* ================= MAIN CONTENT VIEWPORT ================= */}
        <main className="flex-1 overflow-y-auto bg-[var(--color-background)] min-w-0">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
