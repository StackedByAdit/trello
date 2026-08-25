import { WebSocket, WebSocketServer } from "ws";

interface CustomWebSocket extends WebSocket {
    roomId?: string;
}

interface User {
    userId: number;
    socket: CustomWebSocket;
}

const BOARDS: Record<string, User[]> = {};

const server = new WebSocketServer({ port: 8080 });

server.on("connection", (ws) => {
    const socket = ws as CustomWebSocket;
    let joinedRoom = null;

    socket.on("message", (data) => {
        const parsedData = JSON.parse(data.toString());

        if (parsedData.type === "join") {
            const boardId = parsedData.boardId;
            socket.roomId = boardId;

            let boardUsers = BOARDS[boardId];
            if (!boardUsers) {
                boardUsers = [];
                BOARDS[boardId] = boardUsers;
            }

            const newUserId = Math.random();

            for (let i = 0; i < boardUsers.length; i++) {
                const user = boardUsers[i];
                if (user) {
                    user.socket.send(
                        JSON.stringify({
                            type: "join",
                            userId: newUserId,
                        })
                    );
                }
            }

            boardUsers.push({
                userId: newUserId,
                socket: socket,
            });

            socket.send(
                JSON.stringify({
                    type: "initial_state",
                    users: boardUsers
                        .filter((x) => x.userId !== newUserId)
                        .map((u) => u.userId),
                })
            );
        }
    });

    socket.on("close", () => {
        Object.entries(BOARDS).forEach(([roomId, users]) => {
            const userExists = users.find((u) => u.socket === socket);
            console.log(userExists);
            if (userExists) {

                BOARDS[roomId] = users.filter((x) => x.socket !== socket);

                BOARDS[roomId]?.forEach((user) => {
                    user.socket.send(
                        JSON.stringify({
                            type: "leave",
                            userId: userExists.userId,
                        })
                    );
                });
            }
        });
    });
});
