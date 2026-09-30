import type {
  User,
  Organization,
  Board,
  Section,
  Issue,
  IssueWithComments,
  Comment,
  MessageResponse,
  AuthResponse,
  SignupInput,
  SigninInput,
  CreateOrganizationInput,
  DeleteOrganizationInput,
  InviteInput,
  AcceptInput,
  RemoveMemberInput,
  CreateBoardInput,
  UpdateBoardInput,
  DeleteBoardInput,
  CreateSectionInput,
  UpdateSectionInput,
  DeleteSectionInput,
  CreateIssueInput,
  UpdateIssueInput,
  MoveIssueInput,
  CreateCommentInput,
  UpdateCommentInput,
  DeleteCommentInput,
} from "./types";

const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.BUN_PUBLIC_API_URL) ||
  "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Core typed fetch wrapper
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (requiresAuth && typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = token;
    }
  }

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      ...restOptions,
    });
  } catch (err: any) {
    throw new ApiError(0, err?.message || "Network request failed");
  }

  let data: any = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      data?.message || `Request failed with status ${response.status}`;

    // Handle 401 Unauthorized: dispatch global event for AuthProvider redirect
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("api:unauthorized", { detail: { endpoint, status: 401 } })
      );
    }

    throw new ApiError(response.status, errorMessage, data);
  }

  return data as T;
}
