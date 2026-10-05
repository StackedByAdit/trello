import "./index.css";
import { Route, Routes, BrowserRouter } from "react-router";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./components/ui/Toast";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { AppShell } from "./components/layout/AppShell";

import { AuthProvider, ProtectedRoute } from "./auth";
import {
  SignInPage,
  SignUpPage,
  OnboardingPage,
  DashboardPage,
} from "./pages";

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Authentication Routes */}
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />

                {/* Protected Onboarding Route */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Workspace Layout & Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/board/:boardId" element={<SimplePlaceholder title="Board View" />} />
                  <Route
                    path="/members"
                    element={<SimplePlaceholder title="Workspace Members" />}
                  />
                  <Route
                    path="/settings"
                    element={<SimplePlaceholder title="Organization Settings" />}
                  />
                  <Route path="*" element={<DashboardPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </WorkspaceProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function SimplePlaceholder({ title }: { title: string }) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">
        {title}
      </h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        This section is ready for page implementation.
      </p>
    </div>
  );
}

export default App;
