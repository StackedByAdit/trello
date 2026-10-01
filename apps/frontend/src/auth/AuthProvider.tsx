import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { signin as apiSignin, signup as apiSignup } from "../lib/api";
import type { SigninInput, SignupInput } from "../lib/types";

interface AuthContextType {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signin: (credentials: SigninInput) => Promise<string>;
  signup: (credentials: SignupInput) => Promise<string>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwtUserId(token: string | null): string | null {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.userId || parsed.id || null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  });

  const [userId, setUserId] = useState<string | null>(() =>
    parseJwtUserId(token)
  );
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setToken(null);
    setUserId(null);

    // Redirect to signin if not already there
    if (typeof window !== "undefined" && window.location.pathname !== "/signin") {
      window.location.href = "/signin";
    }
  }, []);

  // Listen for 401 Unauthorized events from api.ts
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("api:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("api:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  const signin = async (credentials: SigninInput): Promise<string> => {
    setIsLoading(true);
    try {
      const response = await apiSignin(credentials);
      const receivedToken = response.token;

      if (typeof window !== "undefined") {
        localStorage.setItem("token", receivedToken);
      }
      setToken(receivedToken);
      setUserId(parseJwtUserId(receivedToken));
      return receivedToken;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (credentials: SignupInput): Promise<string> => {
    setIsLoading(true);
    try {
      await apiSignup(credentials);
      // Auto-signin after successful signup for seamless onboarding
      const response = await apiSignin(credentials);
      const receivedToken = response.token;

      if (typeof window !== "undefined") {
        localStorage.setItem("token", receivedToken);
      }
      setToken(receivedToken);
      setUserId(parseJwtUserId(receivedToken));
      return receivedToken;
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        token,
        userId,
        isAuthenticated,
        isLoading,
        signin,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthProvider;
