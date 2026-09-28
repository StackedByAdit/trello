import { WebSocket, WebSocketServer } from "ws";
import { prisma } from "db/client";

interface CustomWebSocket extends WebSocket {
    roomId?: string;
}

interface User {
    userId: number;
    socket: CustomWebSocket;
}

const BOARDS: Record<string, User[]> = {};

const USERS: Record<string, User[]> = {};

const PORT = process.env.WS_PORT ? Number(process.env.WS_PORT) : (process.env.PORT ? Number(process.env.PORT) : 8080);

const server = new WebSocketServer({ port: PORT });

server.on("connection", (ws) => {
    const socket = ws as CustomWebSocket;

    socket.on("message", async (data) => {
        let parsedData: any;
        try {
            parsedData = JSON.parse(data.toString());
        } catch (e) {
            return;
        }

        if (parsedData?.type === "join") {
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

            const board = await prisma.section.findMany({
                where : {
                    boardId
                },
                include : {
                    issues : true
                }
            });

            socket.send(
                JSON.stringify({
                    type: "initial_state",
                    users: boardUsers
                        .filter((x) => x.userId !== newUserId)
                        .map((u) => u.userId),
                    board
                })
            );
        }
    });

    socket.on("close", () => {
        Object.entries(BOARDS).forEach(([roomId, users]) => {
            const userExists = users.find((u) => u.socket === socket);
            if (userExists) {

                BOARDS[roomId] = users.filter((x) => x.socket !== socket);
                if (BOARDS[roomId]?.length === 0) {
                    delete BOARDS[roomId];
                }

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

export { server, BOARDS, USERS };
