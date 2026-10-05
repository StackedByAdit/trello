import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import { Kanban, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { Avatar } from "../components/ui/Avatar";

const USER_COLORS = ["#0D9488", "#EA580C", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B"];

function getUserColor(userId: string | number): string {
  const str = String(userId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]!;
}

export const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const { boards } = useWorkspace();
  const currentBoard = boards.find((b) => b.id === boardId);

  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [activeUsers, setActiveUsers] = useState<(string | number)[]>([]);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!boardId) return;
    let isMounted = true;

    const connectWebSocket = () => {
      if (!isMounted) return;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

      const wsUrl = (typeof process !== "undefined" && process.env?.BUN_PUBLIC_WS_URL) || "ws://localhost:8080";
      setWsStatus("connecting");

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) { ws.close(); return; }
          reconnectAttempts.current = 0;
          setWsStatus("connected");
          ws.send(JSON.stringify({ type: "join", boardId }));
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data?.type === "initial_state") {
              setActiveUsers(data.users || []);
            } else if (data?.type === "join" && data.userId !== undefined) {
              setActiveUsers((prev) => (prev.includes(data.userId) ? prev : [...prev, data.userId]));
            } else if (data?.type === "leave" && data.userId !== undefined) {
              setActiveUsers((prev) => prev.filter((id) => id !== data.userId));
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsStatus("disconnected");
          scheduleReconnect();
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setWsStatus("disconnected");
          ws.close();
        };
      } catch {
        if (!isMounted) return;
        setWsStatus("disconnected");
        scheduleReconnect();
      }
    };

    const scheduleReconnect = () => {
      reconnectAttempts.current += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 15000);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
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

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center -space-x-2">
            <Avatar name="You" size="sm" status="online" className="w-7 h-7 text-xs border-2 border-[var(--color-card)]" />
            {activeUsers.slice(0, 3).map((uid, idx) => (
              <div
                key={`user-${idx}`}
                style={{ backgroundColor: getUserColor(uid) }}
                className="w-7 h-7 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--color-card)]"
              >
                {String(uid).slice(2, 4) || "U"}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-full)] bg-[var(--color-muted)] text-xs font-medium">
            {wsStatus === "connected" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 font-semibold text-[11px]">Live</span>
              </>
            ) : wsStatus === "connecting" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-600 font-semibold text-[11px]">Connecting...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-600 font-semibold text-[11px]">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardPage;
