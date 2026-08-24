import { WebSocketServer } from "ws";

const server = new WebSocketServer({ port: 8080 });

const BOARD: any = {};

server.on("connection", (socket) => {
    let joinedRoom = null;
    socket.on("message", (data) => {
        const parsedData = JSON.parse(data);

        if (parsedData.type === "join") {
            const boardId = parsedData.boardId;
            socket.roomId = boardId;

            if (!BOARD[boardId]) {
                BOARD[boardId] = [];
            }

            const newUserId = Math.random();

            for (let i = 0; i < BOARD[boardId].length; i++) {
                const user = BOARD[boardId][i];

                user.socket.send(
                    JSON.stringify({
                        type: "join",
                        userId: newUserId,
                    })
                );
            }

            BOARD[boardId].push({
                userId: newUserId,
                socket: socket,
            });

            socket.send(
                JSON.stringify({
                    type: "initial_state",
                    users: BOARD[boardId]
                        .filter((x) => x.id != newUserId)
                        .map((u) => u.id),
                })
            );
        }
    });
    
    socket.on("close", () => {
           
    } )
});
