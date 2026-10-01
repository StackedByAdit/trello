import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../auth";
import { getOrganizations } from "../lib/api";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { AuthCard } from "../components/auth/AuthCard";
import {
  ErrorSummary,
  type ErrorSummaryItem,
} from "../components/auth/ErrorSummary";

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation & Error States
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(
    undefined
  );
  const [summaryErrors, setSummaryErrors] = useState<{
    title: string;
    items: ErrorSummaryItem[];
  } | null>(null);

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // If already logged in, redirect user appropriately
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      getOrganizations()
        .then((orgs) => {
          if (!orgs || orgs.length === 0) {
            navigate("/onboarding", { replace: true });
          } else {
            const redirectPath =
              (location.state as any)?.from?.pathname || "/dashboard";
            navigate(redirectPath, { replace: true });
          }
        })
        .catch(() => {
          navigate("/dashboard", { replace: true });
        });
    }
  }, [isAuthenticated, authLoading, navigate, location.state]);

  // Client-side field validations
  const validateEmail = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Email address is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return "Please enter a valid email address (e.g. name@company.com)";
    }
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) {
      return "Password is required";
    }
    if (value.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return undefined;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(undefined);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) {
      setPasswordError(undefined);
    }
  };

  const handleEmailBlur = () => {
    if (email) {
      setEmailError(validateEmail(email));
    }
  };

  const handlePasswordBlur = () => {
    if (password) {
      setPasswordError(validatePassword(password));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 1. Run client-side validation
    const errEmail = validateEmail(email);
    const errPassword = validatePassword(password);

    setEmailError(errEmail);
    setPasswordError(errPassword);

    const errorItems: ErrorSummaryItem[] = [];
    if (errEmail) {
      errorItems.push({ fieldId: "email", message: errEmail });
    }
    if (errPassword) {
      errorItems.push({ fieldId: "password", message: errPassword });
    }

    if (errorItems.length > 0) {
      setSummaryErrors({
        title: "Please fix the following issues to create your account:",
        items: errorItems,
      });
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
      return;
    }

    // Clear previous summary
    setSummaryErrors(null);
    setIsSubmitting(true);

    try {
      // 2. Call signup endpoint (persists token and signs in automatically)
      await signup({
        email: email.trim(),
        password,
      });

      toast({
        title: "Account created!",
        description: "Welcome to Trello. Setting up your workspace...",
        variant: "success",
      });

      // 3. Check organizations to determine route
      try {
        const orgs = await getOrganizations();
        if (!orgs || orgs.length === 0) {
          navigate("/onboarding", { replace: true });
        } else {
          const redirectPath =
            (location.state as any)?.from?.pathname || "/dashboard";
          navigate(redirectPath, { replace: true });
        }
      } catch (orgErr) {
        // New users typically route to /onboarding
        navigate("/onboarding", { replace: true });
      }
    } catch (err: any) {
      const serverMessage =
        err?.data?.message || err?.message || "Failed to create account";

      let userFacingMessage = serverMessage;
      let targetField = "email";

      if (
        serverMessage.toLowerCase().includes("already exists") ||
        serverMessage.toLowerCase().includes("user already")
      ) {
        userFacingMessage =
          "An account with this email address already exists. Try signing in instead.";
        setEmailError("Email address already registered");
      } else {
        setEmailError(serverMessage);
      }

      setSummaryErrors({
        title: "Unable to create account",
        items: [
          {
            fieldId: targetField,
            message: userFacingMessage,
          },
        ],
      });

      toast({
        title: "Sign up failed",
        description: userFacingMessage,
        variant: "error",
      });

      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start organizing boards, workflows, and teams in minutes"
      footerPrompt="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/signin"
    >
      {/* Accessible Error Summary */}
      {summaryErrors && (
        <ErrorSummary
          containerRef={errorSummaryRef}
          title={summaryErrors.title}
          errors={summaryErrors.items}
        />
      )}

      {/* Main Signup Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Field with Label, Icon & Error */}
        <Input
          ref={emailInputRef}
          id="email"
          name="email"
          type="email"
          label={
            <span>
              Work Email{" "}
              <span className="text-[var(--color-destructive)]">*</span>
            </span>
          }
          placeholder="name@company.com"
          value={email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={emailError}
          autoComplete="email"
          disabled={isSubmitting}
          required
          leftIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
        />

        {/* Password Field with Label, Icon, Show/Hide Toggle & Error */}
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          label={
            <span>
              Password{" "}
              <span className="text-[var(--color-destructive)]">*</span>
            </span>
          }
          placeholder="At least 6 characters"
          value={password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          error={passwordError}
          helperText="Must be at least 6 characters."
          autoComplete="new-password"
          disabled={isSubmitting}
          required
          leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              title={showPassword ? "Hide password" : "Show password"}
              tabIndex={0}
              className="p-1 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] cursor-pointer transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          }
        />

        {/* Submit Button with Loading State */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full py-2.5 font-semibold shadow-[var(--shadow-sm)] cursor-pointer"
          >
            Create Account
          </Button>
        </div>
      </form>
    </AuthCard>
  );
};

export default SignUpPage;
