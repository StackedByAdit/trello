/**
 * Types strictly matching Prisma schema in packages/db/prisma/schema.prisma
 */

export type Role = "MEMBER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  password?: string;
  createdAt: string;
  memberships?: Membership[];
  issueMappings?: IssueMapping[];
  comments?: Comment[];
}

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberships?: Membership[];
  boards?: Board[];
}

export interface Membership {
  id: string;
  userId: string;
  orgId: string;
  role: Role;
  user?: User;
  org?: Organization;
}

export interface Board {
  id: string;
  title: string;
  organizationId: string;
  createdAt: string;
  organization?: Organization;
  sections?: Section[];
  issues?: Issue[];
}

export interface Section {
  id: string;
  title: string;
  boardId: string;
  order: number;
  board?: Board;
  issues?: Issue[];
}

export interface Issue {
  id: string;
  title: string;
  description: string | null;
  boardId: string;
  sectionId: string;
  createdAt: string;
  board?: Board;
  section?: Section;
  comments?: Comment[];
  issueMappings?: IssueMapping[];
}

export interface IssueMapping {
  id: string;
  userId: string;
  issueId: string;
  user?: User;
  issue?: Issue;
}

export interface Comment {
  id: string;
  text: string;
  issueId: string;
  userId: string;
  createdAt: string;
  issue?: Issue;
  user?: User;
}

/**
 * Endpoint Response & Composite Types
 */
export interface IssueWithComments extends Issue {
  board: Board;
  comments: Comment[];
}

export interface MessageResponse {
  message: string;
}

export interface AuthResponse {
  token: string;
}

export interface SignupResponse {
  message: string;
}

// Request Payload Types
export interface SignupInput {
  email: string;
  password: string;
}

export interface SigninInput {
  email: string;
  password: string;
}

export interface CreateOrganizationInput {
  name: string;
  description?: string;
}

export interface DeleteOrganizationInput {
  orgId: string;
}

export interface InviteInput {
  email: string;
  orgId: string;
}

export interface AcceptInput {
  orgId: string;
}

export interface RemoveMemberInput {
  userId: string;
  orgId: string;
}

export interface CreateBoardInput {
  title: string;
  organizationId: string;
}

export interface UpdateBoardInput {
  boardId: string;
  title: string;
}

export interface DeleteBoardInput {
  boardId: string;
}

export interface CreateSectionInput {
  title: string;
  boardId: string;
  order: number;
}

export interface UpdateSectionInput {
  sectionId: string;
  title?: string;
  order?: number;
}

export interface DeleteSectionInput {
  sectionId: string;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  boardId: string;
  sectionId: string;
}

export interface UpdateIssueInput {
  issueId: string;
  title?: string;
  description?: string;
}

export interface MoveIssueInput {
  issueId: string;
  sectionId: string;
}

export interface CreateCommentInput {
  text: string;
  issueId: string;
}

export interface UpdateCommentInput {
  commentId: string;
  text: string;
}

export interface DeleteCommentInput {
  commentId: string;
}
