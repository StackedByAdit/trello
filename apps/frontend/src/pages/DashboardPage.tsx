import React from "react";
import { Plus } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export const DashboardPage: React.FC = () => {
  const { activeOrg, openCreateBoardModal } = useWorkspace();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
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
            {activeOrg?.description || "Manage projects, track issues, and collaborate with your team across Kanban boards."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={openCreateBoardModal}
            leftIcon={<Plus className="w-4 h-4" />}
            className="cursor-pointer shadow-[var(--shadow-sm)] font-semibold"
          >
            Create Board
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
