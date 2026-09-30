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

