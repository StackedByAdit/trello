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

  const activeOrgRef = useRef<Organization | null>(activeOrg);
  activeOrgRef.current = activeOrg;

  const setActiveOrg = useCallback((org: Organization) => {
    setActiveOrgState(org);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, org.id);
      } catch {
        // Handle localStorage failure
      }
    }
  }, []);

  const fetchBoards = useCallback(async (_orgId?: string): Promise<Board[]> => {
    return [];
  }, []);

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
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setActiveOrgState(null);
      setBoards([]);
    }
  }, [isAuthenticated, token, fetchOrganizations]);

  const createOrg = async (input: CreateOrganizationInput): Promise<Organization> => {
    setIsLoadingOrgs(true);
    try {
      const newOrg = await apiCreateOrganization(input);
      setOrganizations((prev) => [...prev, newOrg]);
      setActiveOrg(newOrg);
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

  const createBoard = async (_title: string): Promise<Board> => {
    throw new Error("Not implemented");
  };

  const updateBoard = async (_boardId: string, _title: string): Promise<Board> => {
    throw new Error("Not implemented");
  };

  const deleteBoard = async (_boardId: string): Promise<void> => {
    throw new Error("Not implemented");
  };

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
        openCreateBoardModal: () => setIsCreateBoardModalOpen(true),
        closeCreateBoardModal: () => setIsCreateBoardModalOpen(false),
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
