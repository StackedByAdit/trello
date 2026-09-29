import React, { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router";
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
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Dropdown } from "../ui/Dropdown";

export interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, actualTheme, toggleTheme } = useTheme();

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

  interface Organization {
    id: string;
    name: string;
    role: string;
  }

  // Mock organizations for org switcher
  const organizations: Organization[] = [
    { id: "org-1", name: "Engineering Team", role: "Admin" },
    { id: "org-2", name: "Product & Design", role: "Member" },
    { id: "org-3", name: "Marketing HQ", role: "Member" },
  ];
  const [activeOrg, setActiveOrg] = useState<Organization>(organizations[0]!);

  // Mock boards for sidebar boards list
  const boards = [
    { id: "1", title: "Product Roadmap", color: "#0D9488" },
    { id: "2", title: "Sprint 42 - Backend", color: "#EA580C" },
    { id: "3", title: "Design System Revamp", color: "#6366F1" },
    { id: "4", title: "Customer Bug Tracker", color: "#EC4899" },
  ];

  const orgDropdownItems = [
    ...organizations.map((org) => ({
      id: org.id,
      label: (
        <div className="flex items-center justify-between w-full">
          <span>{org.name}</span>
          {activeOrg.id === org.id && (
            <Check className="w-4 h-4 text-[var(--color-primary)]" />
          )}
        </div>
      ),
      icon: <Building2 className="w-4 h-4 text-[var(--color-muted-foreground)]" />,
      onClick: () => setActiveOrg(org),
    })),
    { divider: true, label: "" },
    {
      id: "new-org",
      label: "Create Organization",
      icon: <Plus className="w-4 h-4 text-[var(--color-primary)]" />,
      onClick: () => {},
    },
  ];

  const userDropdownItems = [
    {
      id: "profile",
      label: (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-[var(--color-foreground)]">
            Alex Johnson
          </span>
          <span className="text-[11px] text-[var(--color-muted-foreground)]">
            alex.j@example.com
          </span>
        </div>
      ),
      onClick: () => {},
    },
    { divider: true, label: "" },
    {
      id: "user-profile",
      label: "Profile Settings",
      icon: <UserIcon className="w-4 h-4" />,
      onClick: () => {},
    },
    {
      id: "user-settings",
      label: "Account Preferences",
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {},
    },
    { divider: true, label: "" },
    {
      id: "sign-out",
      label: "Sign Out",
      destructive: true,
      icon: <LogOut className="w-4 h-4" />,
      onClick: () => {},
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
    <div className="min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)] font-sans antialiased selection:bg-[var(--color-primary)] selection:text-white">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="sticky top-0 z-30 h-14 w-full bg-[var(--color-card)] border-b border-[var(--color-border)] px-3 sm:px-4 flex items-center justify-between gap-2 shadow-[var(--shadow-sm)]">
        {/* Left Side: Mobile Menu Button + Brand Logo */}
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
          <div className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white flex items-center justify-center shadow-[var(--shadow-sm)]">
              <Kanban className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-[var(--color-foreground)]">
              Trello
            </span>
            <Badge variant="accent" size="sm" className="hidden sm:inline-flex ml-1">
              Pro
            </Badge>
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
                <Avatar
                  name="Alex Johnson"
                  size="sm"
                  status="online"
                />
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
              <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white flex items-center justify-center">
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

          {/* Org Switcher Header */}
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
                        {activeOrg.name}
                      </div>
                      <div className="text-[10px] text-[var(--color-muted-foreground)] font-medium">
                        {activeOrg.role}
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
                to="/"
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
                  aria-label="Create new board"
                  title="Create new board"
                  className="w-6 h-6 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-0.5">
                {boards.map((board) => (
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
                      style={{ backgroundColor: board.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate flex-1">{board.title}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Footer with Quick Status */}
          <div className="p-3 border-t border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)] flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Workspace Sync</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
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
