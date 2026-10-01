import { useEffect } from "react";
import "./index.css";
import { Route, Routes, BrowserRouter, useParams } from "react-router";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./components/ui/Toast";
import { AppShell } from "./components/layout/AppShell";
import { Kanban, Sparkles } from "lucide-react";
import { Badge } from "./components/ui/Badge";

import { AuthProvider, ProtectedRoute } from "./auth";
import { SignInPage, SignUpPage, OnboardingPage } from "./pages";

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
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
                <Route path="/" element={<HomePlaceholder />} />
                <Route path="/dashboard" element={<HomePlaceholder />} />
                <Route path="/board/:boardId" element={<Board />} />
                <Route
                  path="/members"
                  element={<SimplePlaceholder title="Workspace Members" />}
                />
                <Route
                  path="/settings"
                  element={<SimplePlaceholder title="Organization Settings" />}
                />
                <Route path="*" element={<HomePlaceholder />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function HomePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center mb-4 shadow-[var(--shadow-md)]">
        <Kanban className="w-7 h-7" aria-hidden="true" />
      </div>
      <Badge variant="accent" size="md" className="mb-3">
        <Sparkles className="w-3.5 h-3.5 mr-1" /> Ready for Development
      </Badge>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-foreground)] mb-2">
        Welcome to Trello
      </h1>
      <p className="text-sm text-[var(--color-muted-foreground)] max-w-md leading-relaxed mb-6">
        Select a board from the sidebar to view columns and tasks, or switch organizations using the dropdown.
      </p>
    </div>
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

function Board() {
  const { boardId } = useParams();

  useEffect(() => {
    if (!boardId) return;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket("ws://localhost:8080");

      ws.onopen = () => {
        ws?.send(
          JSON.stringify({
            type: "join",
            boardId,
          })
        );
      };
    } catch {
      // WS server might not be running during standalone frontend testing
    }

    return () => {
      ws?.close();
    };
  }, [boardId]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white flex items-center justify-center">
          <Kanban className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">
            Board #{boardId}
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Connected via WebSocket to board sync channel
          </p>
        </div>
      </div>
      <div className="p-6 border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-card)] text-center text-sm text-[var(--color-muted-foreground)]">
        Board #{boardId} view layout ready. Drag and drop (@dnd-kit) and board columns will be placed here.
      </div>
    </div>
  );
}

export default App;
