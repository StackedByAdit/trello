import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  Users,
  Shield,
  ShieldAlert,
  UserPlus,
  UserMinus,
  Trash2,
  Mail,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../auth";
import { useWorkspace } from "../context/WorkspaceContext";
import { getMembers, invite, removeMember } from "../lib/api";
import type { Membership } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { useToast } from "../components/ui/Toast";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const {
    activeOrg,
    organizations,
    isLoadingOrgs,
    updateOrg,
    deleteOrg,
  } = useWorkspace();
  const { toast } = useToast();

  // 1. General Org Details State
  const [orgName, setOrgName] = useState(activeOrg?.name || "");
  const [orgDesc, setOrgDesc] = useState(activeOrg?.description || "");
  const [orgNameError, setOrgNameError] = useState<string | null>(null);
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // 2. Members List State
  const [members, setMembers] = useState<Membership[]>(
    activeOrg?.memberships || []
  );
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  // 3. Invite Member State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // 4. Remove Member State
  const [memberToRemove, setMemberToRemove] = useState<Membership | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // 5. Delete Org State
  const [isDeleteOrgModalOpen, setIsDeleteOrgModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);

  // Keep form inputs synced with activeOrg
  useEffect(() => {
    if (activeOrg) {
      setOrgName(activeOrg.name);
      setOrgDesc(activeOrg.description || "");
      setOrgNameError(null);
    }
  }, [activeOrg?.id, activeOrg?.name, activeOrg?.description]);

  // Load members for active organization
  const fetchMembersList = useCallback(async () => {
    if (!activeOrg?.id) return;
    setIsLoadingMembers(true);
    setMembersError(null);
    try {
      const fetched = await getMembers(activeOrg.id);
      setMembers(fetched);
    } catch (err: any) {
      // If endpoint error, fall back to activeOrg.memberships if available
      if (activeOrg.memberships && activeOrg.memberships.length > 0) {
        setMembers(activeOrg.memberships);
      } else {
        setMembersError(
          err?.data?.message || err?.message || "Failed to load members"
        );
      }
    } finally {
      setIsLoadingMembers(false);
    }
  }, [activeOrg?.id, activeOrg?.memberships]);

  useEffect(() => {
    if (activeOrg?.id) {
      fetchMembersList();
    }
  }, [activeOrg?.id, fetchMembersList]);

  // Determine current user role in the active organization
  const { currentMember, isAdmin } = useMemo(() => {
    if (!userId) return { currentMember: undefined, isAdmin: false };

    // Search in loaded members
    const member = members.find(
      (m) => m.userId === userId || m.user?.id === userId
    );

    // Fall back to activeOrg.memberships
    const fallbackMember = activeOrg?.memberships?.find(
      (m) => m.userId === userId || m.user?.id === userId
    );

    const resolved = member || fallbackMember;
    const isUserAdmin = resolved?.role === "ADMIN";

    return {
      currentMember: resolved,
      isAdmin: isUserAdmin,
    };
  }, [userId, members, activeOrg?.memberships]);

  // Detect unsaved changes in general details
  const isDirty = useMemo(() => {
    if (!activeOrg) return false;
    const initialName = activeOrg.name.trim();
    const initialDesc = (activeOrg.description || "").trim();
    return orgName.trim() !== initialName || orgDesc.trim() !== initialDesc;
  }, [activeOrg, orgName, orgDesc]);

  // Reset form to activeOrg values
  const handleResetOrgDetails = () => {
    if (activeOrg) {
      setOrgName(activeOrg.name);
      setOrgDesc(activeOrg.description || "");
      setOrgNameError(null);
    }
  };

  // Save Organization Details
  const handleSaveOrgDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !activeOrg) return;

    const trimmedName = orgName.trim();
    if (!trimmedName) {
      setOrgNameError("Organization name is required");
      return;
    }

    setOrgNameError(null);
    setIsSavingOrg(true);
    try {
      await updateOrg({
        orgId: activeOrg.id,
        name: trimmedName,
        description: orgDesc.trim() || null,
      });
    } catch (err: any) {
      setOrgNameError(
        err?.data?.message || err?.message || "Failed to update organization"
      );
    } finally {
      setIsSavingOrg(false);
    }
  };

  // Handle Invite Member
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !activeOrg || isInviting) return;

    const trimmedEmail = inviteEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setInviteError("Please enter an email address");
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setInviteError("Please enter a valid email address");
      return;
    }

    setIsInviting(true);
    setInviteError(null);

    try {
      await invite({
        email: trimmedEmail,
        orgId: activeOrg.id,
      });

      setInviteEmail("");
      setInviteError(null);
      toast({
        title: "Member added",
        description: `${trimmedEmail} was added to ${activeOrg.name}.`,
        variant: "success",
      });

      // Refresh members list
      await fetchMembersList();
    } catch (err: any) {
      const status = err?.status;
      const rawMessage = (
        err?.data?.message ||
        err?.message ||
        ""
      ).toLowerCase();

      // Show specific inline errors as required
      if (status === 404 || rawMessage.includes("user not found")) {
        setInviteError("User not found with this email");
      } else if (rawMessage.includes("already a member")) {
        setInviteError("This user is already a member of this organization");
      } else if (rawMessage.includes("cannot invite yourself")) {
        setInviteError("You cannot invite yourself");
      } else if (status === 403 || rawMessage.includes("forbidden")) {
        setInviteError("Only workspace administrators can invite members");
      } else {
        setInviteError(
          err?.data?.message || err?.message || "Failed to invite member"
        );
      }
    } finally {
      setIsInviting(false);
    }
  };

  // Handle Confirm Remove Member
  const handleConfirmRemoveMember = async () => {
    if (!isAdmin || !activeOrg || !memberToRemove || isRemovingMember) return;

    setIsRemovingMember(true);
    try {
      await removeMember({
        userId: memberToRemove.userId,
        orgId: activeOrg.id,
      });

      const removedEmail =
        memberToRemove.user?.email || memberToRemove.userId;
      toast({
        title: "Member removed",
        description: `${removedEmail} was removed from ${activeOrg.name}.`,
        variant: "success",
      });

      setMemberToRemove(null);
      await fetchMembersList();
    } catch (err: any) {
      toast({
        title: "Could not remove member",
        description:
          err?.data?.message || err?.message || "Failed to remove member",
        variant: "error",
      });
    } finally {
      setIsRemovingMember(false);
    }
  };

  // Handle Confirm Delete Organization
  const handleConfirmDeleteOrg = async () => {
    if (!isAdmin || !activeOrg || isDeletingOrg) return;
    if (deleteConfirmInput.trim() !== activeOrg.name) return;

    setIsDeletingOrg(true);
    try {
      const orgNameToDelete = activeOrg.name;
      await deleteOrg(activeOrg.id);

      setIsDeleteOrgModalOpen(false);
      setDeleteConfirmInput("");

      // If user has other organizations, redirect to dashboard; otherwise onboarding
      const remainingOrgs = organizations.filter(
        (o) => o.id !== activeOrg.id
      );
      if (remainingOrgs.length > 0) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    } catch (err: any) {
      toast({
        title: "Could not delete organization",
        description:
          err?.data?.message || err?.message || "Failed to delete organization",
        variant: "error",
      });
    } finally {
      setIsDeletingOrg(false);
    }
  };

  // ----------------------------------------------------
  // Loading & Empty States
  // ----------------------------------------------------
  if (isLoadingOrgs && !activeOrg) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-[var(--color-muted)] rounded-[var(--radius-md)]" />
        <div className="h-4 w-96 bg-[var(--color-muted)] rounded" />
        <div className="h-64 bg-[var(--color-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 space-y-4">
          <div className="h-6 w-48 bg-[var(--color-muted)] rounded" />
          <div className="h-10 w-full bg-[var(--color-muted)] rounded" />
          <div className="h-24 w-full bg-[var(--color-muted)] rounded" />
        </div>
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-8 sm:p-12 text-center space-y-4 shadow-[var(--shadow-sm)]">
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-muted)] flex items-center justify-center mx-auto text-[var(--color-muted-foreground)]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">
              No Organization Selected
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1 max-w-md mx-auto">
              Please create a workspace or select one from the top bar to view its settings.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate("/onboarding")}
            className="cursor-pointer"
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Create a Workspace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* ================= PAGE HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-foreground)] tracking-tight">
              Settings
            </h1>
            {isAdmin ? (
              <Badge variant="accent" size="sm" dot>
                ADMIN
              </Badge>
            ) : (
              <Badge variant="secondary" size="sm" dot>
                MEMBER
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Workspace configuration and member permissions for{" "}
            <span className="font-semibold text-[var(--color-foreground)]">
              {activeOrg.name}
            </span>
            .
          </p>
        </div>
      </div>

      {/* Member Info Notice: shown when user is not admin */}
      {!isAdmin && (
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 flex items-start gap-3 text-xs leading-relaxed">
          <ShieldAlert className="w-5 h-5 text-[var(--color-muted-foreground)] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[var(--color-foreground)]">
              Viewing as Member:
            </span>{" "}
            <span className="text-[var(--color-muted-foreground)]">
              Only workspace administrators can edit organization details, invite or remove team members, and delete the workspace.
            </span>
          </div>
        </div>
      )}

      {/* ================= 1. ORG NAME & DESCRIPTION ================= */}
      <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)]">
                General Information
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Update your organization identity and description.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveOrgDetails} className="p-6 space-y-5">
          <div className="space-y-4">
            <Input
              id="settings-org-name"
              label="Organization Name"
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value);
                if (orgNameError) setOrgNameError(null);
              }}
              disabled={!isAdmin || isSavingOrg}
              error={orgNameError || undefined}
              helperText={
                !isAdmin
                  ? "Only administrators can edit the organization name."
                  : undefined
              }
              placeholder="e.g. Acme Corp"
              required
            />

            <Textarea
              id="settings-org-desc"
              label="Description"
              value={orgDesc}
              onChange={(e) => setOrgDesc(e.target.value)}
              disabled={!isAdmin || isSavingOrg}
              rows={3}
              placeholder="Brief description of what your workspace collaborates on..."
              helperText={
                !isAdmin
                  ? "Only administrators can edit the description."
                  : undefined
              }
            />
          </div>

          {/* Admin Save/Reset Controls: Only rendered for Admins */}
          {isAdmin && (
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--color-border)]">
              {isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetOrgDetails}
                  disabled={isSavingOrg}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="cursor-pointer"
                >
                  Discard
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingOrg}
                disabled={isSavingOrg || !isDirty || !orgName.trim()}
                leftIcon={<Save className="w-4 h-4" />}
                className="cursor-pointer font-semibold shadow-[var(--shadow-xs)]"
              >
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </section>

      {/* ================= 2. MEMBERS LIST & ADD MEMBER ================= */}
      <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--color-foreground)]">
                  Members
                </h2>
                <Badge variant="outline" size="sm">
                  {members.length} {members.length === 1 ? "member" : "members"}
                </Badge>
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Manage who has access to this workspace.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Add Member Box: ONLY rendered for Admins */}
          {isAdmin && (
            <div className="p-4 sm:p-5 rounded-[var(--radius-lg)] bg-[var(--color-muted)]/30 border border-[var(--color-border)] space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-foreground)] flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[var(--color-primary)]" />
                  Add Member
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Invite an existing registered user by their email address.
                </p>
              </div>

              <form onSubmit={handleInviteSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1 w-full">
                    <Input
                      id="settings-invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        if (inviteError) setInviteError(null);
                      }}
                      placeholder="user@example.com"
                      leftIcon={<Mail className="w-4 h-4" />}
                      error={inviteError || undefined}
                      disabled={isInviting}
                      className="w-full"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isInviting}
                    disabled={isInviting || !inviteEmail.trim()}
                    leftIcon={<UserPlus className="w-4 h-4" />}
                    className="w-full sm:w-auto shrink-0 cursor-pointer font-semibold"
                  >
                    Invite
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Members List Table / Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] px-1">
              <span>Member</span>
              <div className="flex items-center gap-8">
                <span>Role</span>
                {isAdmin && <span className="w-20 text-right">Actions</span>}
              </div>
            </div>

            {isLoadingMembers && members.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Spinner size="md" className="mx-auto text-[var(--color-primary)]" />
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Loading members...
                </p>
              </div>
            ) : membersError ? (
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-destructive)]/10 text-center text-xs text-[var(--color-destructive)] space-y-2">
                <p>{membersError}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchMembersList}
                  className="mx-auto cursor-pointer"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-card)]">
                {members.map((member) => {
                  const memberEmail =
                    member.user?.email || member.userId;
                  const isCurrent =
                    member.userId === userId || member.user?.id === userId;
                  const isMemberAdmin = member.role === "ADMIN";

                  return (
                    <div
                      key={member.id}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[var(--color-muted)]/20 transition-colors"
                    >
                      {/* Member Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={memberEmail}
                          size="md"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--color-foreground)] truncate">
                              {memberEmail}
                            </span>
                            {isCurrent && (
                              <Badge variant="outline" size="sm">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--color-muted-foreground)] truncate">
                            Joined {formatDate(member.user?.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Member Role Badge & Actions */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        {isMemberAdmin ? (
                          <Badge variant="accent" size="sm" dot>
                            ADMIN
                          </Badge>
                        ) : (
                          <Badge variant="secondary" size="sm">
                            MEMBER
                          </Badge>
                        )}

                        {/* Remove Action: Only rendered for Admins */}
                        {isAdmin && (
                          <div className="w-20 text-right">
                            {isCurrent ? (
                              <span className="text-[11px] text-[var(--color-muted-foreground)] italic select-none">
                                Admin
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(member)}
                                className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-destructive)]/10 transition-colors cursor-pointer"
                                title={`Remove ${memberEmail}`}
                                aria-label={`Remove ${memberEmail}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Remove</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= 3. DANGER ZONE: ONLY SHOWN TO ADMINS ================= */}
      {isAdmin && (
        <section className="rounded-[var(--radius-xl)] border-2 border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 overflow-hidden">
          <div className="p-6 border-b border-[var(--color-destructive)]/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--color-destructive)]">
                  Danger Zone
                </h2>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Irreversible actions for this organization.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                Delete this organization
              </h3>
              <p className="text-xs text-[var(--color-muted-foreground)] max-w-lg leading-relaxed">
                Permanently remove{" "}
                <span className="font-semibold text-[var(--color-foreground)]">
                  {activeOrg.name}
                </span>{" "}
                and all associated boards, lists, issues, and memberships. This action cannot be undone.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={() => {
                setDeleteConfirmInput("");
                setIsDeleteOrgModalOpen(true);
              }}
              leftIcon={<Trash2 className="w-4 h-4" />}
              className="shrink-0 cursor-pointer font-semibold shadow-[var(--shadow-sm)]"
            >
              Delete Organization
            </Button>
          </div>
        </section>
      )}

      {/* ================= MODAL: REMOVE MEMBER CONFIRMATION ================= */}
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remove Member"
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMemberToRemove(null)}
              disabled={isRemovingMember}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmRemoveMember}
              isLoading={isRemovingMember}
              disabled={isRemovingMember}
              className="cursor-pointer font-semibold"
            >
              Remove Member
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-foreground)] leading-relaxed">
            Are you sure you want to remove{" "}
            <span className="font-bold text-[var(--color-foreground)]">
              {memberToRemove?.user?.email || memberToRemove?.userId}
            </span>{" "}
            from{" "}
            <span className="font-semibold text-[var(--color-foreground)]">
              {activeOrg.name}
            </span>
            ?
          </p>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-destructive)]/10 text-xs text-[var(--color-destructive)] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This user will immediately lose access to all boards, cards, and data in this workspace.
            </span>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: DELETE ORG CONFIRMATION ================= */}
      <Modal
        isOpen={isDeleteOrgModalOpen}
        onClose={() => {
          setIsDeleteOrgModalOpen(false);
          setDeleteConfirmInput("");
        }}
        title="Delete Organization"
        maxWidth="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDeleteOrgModalOpen(false);
                setDeleteConfirmInput("");
              }}
              disabled={isDeletingOrg}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteOrg}
              isLoading={isDeletingOrg}
              disabled={
                isDeletingOrg ||
                deleteConfirmInput.trim() !== activeOrg.name
              }
              className="cursor-pointer font-semibold"
            >
              Delete Organization
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-destructive)]/10 text-xs text-[var(--color-destructive)] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Warning:</strong> This action cannot be undone. All boards, lists, issues, and memberships under this organization will be permanently destroyed.
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-[var(--color-foreground)]">
              To verify deletion, type the organization name{" "}
              <strong className="text-[var(--color-foreground)] underline select-all">
                {activeOrg.name}
              </strong>{" "}
              in the confirmation box below:
            </p>
            <Input
              id="confirm-delete-org-name"
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={activeOrg.name}
              autoFocus
              className="font-mono text-sm"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
