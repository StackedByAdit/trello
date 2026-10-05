import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import { Kanban, ArrowLeft } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";

export const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const { boards } = useWorkspace();
  const currentBoard = boards.find((b) => b.id === boardId);

  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!boardId) return;

    const wsUrl = (typeof process !== "undefined" && process.env?.BUN_PUBLIC_WS_URL) || "ws://localhost:8080";
    setWsStatus("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("connected");
        ws.send(JSON.stringify({ type: "join", boardId }));
      };

      ws.onclose = () => setWsStatus("disconnected");
      ws.onerror = () => {
        setWsStatus("disconnected");
        ws.close();
      };
    } catch {
      setWsStatus("disconnected");
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [boardId]);

  const boardTitle = currentBoard?.title || `Board #${boardId?.slice(0, 6)}`;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[var(--color-background)]">
      <div className="h-14 px-4 sm:px-6 bg-[var(--color-card)]/80 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/dashboard"
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
            <Kanban className="w-4 h-4" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-foreground)] truncate">
            {boardTitle}
          </h1>
        </div>
      </div>
      <div className="p-6 text-sm text-[var(--color-muted-foreground)]">
        Connecting to board real-time channel ({wsStatus})...
      </div>
    </div>
  );
};

export default BoardPage;
