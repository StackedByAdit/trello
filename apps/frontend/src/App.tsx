import { useEffect } from "react";
import "./index.css";

import { Route, Routes, BrowserRouter, useParams } from "react-router";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/board/:boardId" element={<Board />} />
      </Routes>
    </BrowserRouter>
  );
}

function Board() {
  const { boardId } = useParams();

  useEffect(() => {
    if (!boardId) return;

    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          boardId,
        })
      );
    };

    return () => {
      ws.close();
    };
  }, [boardId]);

  return <div>
    You are on board {boardId}
  </div>;
}

export default App;
