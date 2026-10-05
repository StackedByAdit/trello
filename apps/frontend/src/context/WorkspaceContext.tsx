import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  getOrganizations as apiGetOrganizations,
  createOrganization as apiCreateOrganization,
  getBoards as apiGetBoards,
  createBoard as apiCreateBoard,
  updateBoard as apiUpdateBoard,
  deleteBoard as apiDeleteBoard,
} from "../lib/api";
import type {
  Organization,
  Board,
  CreateOrganizationInput,
} from "../lib/types";
import { useAuth } from "../auth";
import { useToast } from "../components/ui/Toast";

const ACTIVE_ORG_STORAGE_KEY = "active_org_id";

export interface WorkspaceContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  setActiveOrg: (org: Organization) => void;
  boards: Board[];
  isLoadingOrgs: boolean;
  isLoadingBoards: boolean;
  orgsError: string | null;
  boardsError: string | null;
  fetchOrganizations: () => Promise<Organization[]>;
  fetchBoards: (orgId?: string) => Promise<Board[]>;
  createOrg: (input: CreateOrganizationInput) => Promise<Organization>;
  createBoard: (title: string) => Promise<Board>;
  updateBoard: (boardId: string, title: string) => Promise<Board>;
  deleteBoard: (boardId: string) => Promise<void>;
  isCreateBoardModalOpen: boolean;
  openCreateBoardModal: () => void;
  closeCreateBoardModal: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, token } = useAuth();
  const { toast } = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);

  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [orgsError, setOrgsError] = useState<string | null>(null);
  const [boardsError, setBoardsError] = useState<string | null>(null);

  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);

  // Keep a stable ref to activeOrg to prevent stale closures
  const activeOrgRef = useRef<Organization | null>(activeOrg);
  activeOrgRef.current = activeOrg;

  const setActiveOrg = useCallback((org: Organization) => {
    setActiveOrgState(org);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, org.id);
      } catch {
        // Handle localStorage disabled / quota exceeded gracefully
      }
    }
  }, []);

  const fetchBoards = useCallback(
    async (targetOrgId?: string): Promise<Board[]> => {
      const orgId = targetOrgId || activeOrgRef.current?.id;
      if (!orgId) {
        setBoards([]);
        setIsLoadingBoards(false);
        return [];
      }

      setIsLoadingBoards(true);
      setBoardsError(null);
      try {
        const fetchedBoards = await apiGetBoards(orgId);
        setBoards(fetchedBoards || []);
        return fetchedBoards || [];
      } catch (err: any) {
        const msg =
          err?.data?.message || err?.message || "Failed to load boards";
        setBoardsError(msg);
        return [];
      } finally {
        setIsLoadingBoards(false);
      }
    },
    []
  );

  const fetchOrganizations = useCallback(async (): Promise<Organization[]> => {
    if (!isAuthenticated) {
      setOrganizations([]);
      setActiveOrgState(null);
      setBoards([]);
      return [];
    }

    setIsLoadingOrgs(true);
    setOrgsError(null);
    try {
      const orgs = await apiGetOrganizations();
      const safeOrgs = orgs || [];
      setOrganizations(safeOrgs);

      if (safeOrgs.length > 0) {
        let savedOrgId: string | null = null;
        if (typeof window !== "undefined") {
          savedOrgId = localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
        }

        const matchedOrg = savedOrgId
          ? safeOrgs.find((o) => o.id === savedOrgId)
          : null;

        const nextActive = matchedOrg || safeOrgs[0]!;
        setActiveOrgState(nextActive);
        if (typeof window !== "undefined") {
          localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, nextActive.id);
        }

        // Fetch boards for the selected org
        await fetchBoards(nextActive.id);
      } else {
        setActiveOrgState(null);
        setBoards([]);
      }

      return safeOrgs;
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.message || "Failed to load organizations";
      setOrgsError(msg);
      return [];
    } finally {
      setIsLoadingOrgs(false);
    }
  }, [isAuthenticated, fetchBoards]);

  // Initial load when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setActiveOrgState(null);
      setBoards([]);
      setOrgsError(null);
      setBoardsError(null);
    }
  }, [isAuthenticated, token, fetchOrganizations]);

  // When active organization changes, reload boards
  useEffect(() => {
    if (activeOrg?.id) {
      fetchBoards(activeOrg.id);
    }
  }, [activeOrg?.id, fetchBoards]);

  const createOrg = async (input: CreateOrganizationInput): Promise<Organization> => {
    setIsLoadingOrgs(true);
    try {
      const newOrg = await apiCreateOrganization(input);
      setOrganizations((prev) => [...prev, newOrg]);
      setActiveOrg(newOrg);
      setBoards([]);
      toast({
        title: "Workspace created!",
        description: `Welcome to ${newOrg.name}.`,
        variant: "success",
      });
      return newOrg;
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.message || "Failed to create organization";
      toast({
        title: "Could not create workspace",
        description: msg,
        variant: "error",
      });
      throw err;
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const createBoard = async (title: string): Promise<Board> => {
    if (!activeOrgRef.current) {
      const err = new Error("No active organization selected");
      toast({
        title: "Cannot create board",
        description: "Please select or create an organization first.",
        variant: "error",
      });
      throw err;
    }

    try {
      const newBoard = await apiCreateBoard({
        title: title.trim(),
        organizationId: activeOrgRef.current.id,
      });

      // No optimistic bugs: append confirmed board from server response
      setBoards((prev) => [...prev, newBoard]);
      toast({
        title: "Board created",
        description: `"${newBoard.title}" is ready to use.`,
        variant: "success",
      });
      return newBoard;
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.message || "Failed to create board";
      toast({
        title: "Could not create board",
        description: msg,
        variant: "error",
      });
      throw err;
    }
  };

  const updateBoard = async (
    boardId: string,
    title: string
  ): Promise<Board> => {
    const trimmedTitle = title.trim();
    const previousBoards = [...boards];

    // Optimistically update
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, title: trimmedTitle } : b))
    );

    try {
      const updated = await apiUpdateBoard({
        boardId,
        title: trimmedTitle,
      });

      // Confirm with server response
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? updated : b))
      );
      toast({
        title: "Board renamed",
        description: `Board renamed to "${updated.title}".`,
        variant: "success",
      });
      return updated;
    } catch (err: any) {
      // Roll back on failure to avoid optimistic bugs
      setBoards(previousBoards);
      const msg =
        err?.data?.message || err?.message || "Failed to update board";
      toast({
        title: "Could not rename board",
        description: msg,
        variant: "error",
      });
      throw err;
    }
  };

  const deleteBoard = async (boardId: string): Promise<void> => {
    const previousBoards = [...boards];
    const targetBoard = boards.find((b) => b.id === boardId);

    // Optimistically remove
    setBoards((prev) => prev.filter((b) => b.id !== boardId));

    try {
      await apiDeleteBoard(boardId);
      toast({
        title: "Board deleted",
        description: targetBoard
          ? `"${targetBoard.title}" was deleted.`
          : "Board was deleted successfully.",
        variant: "success",
      });
    } catch (err: any) {
      // Roll back on failure to avoid optimistic bugs
      setBoards(previousBoards);
      const msg =
        err?.data?.message || err?.message || "Failed to delete board";
      toast({
        title: "Could not delete board",
        description: msg,
        variant: "error",
      });
      throw err;
    }
  };

  const openCreateBoardModal = useCallback(() => {
    setIsCreateBoardModalOpen(true);
  }, []);

  const closeCreateBoardModal = useCallback(() => {
    setIsCreateBoardModalOpen(false);
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        organizations,
        activeOrg,
        setActiveOrg,
        boards,
        isLoadingOrgs,
        isLoadingBoards,
        orgsError,
        boardsError,
        fetchOrganizations,
        fetchBoards,
        createOrg,
        createBoard,
        updateBoard,
        deleteBoard,
        isCreateBoardModalOpen,
        openCreateBoardModal,
        closeCreateBoardModal,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};

export default WorkspaceContext;
