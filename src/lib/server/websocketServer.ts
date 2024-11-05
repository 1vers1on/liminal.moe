import { useServer } from "vite-sveltekit-node-ws";
import { Server } from "socket.io";

export const websocketServer = () =>
    useServer(
        (server) => {
            const wsServer = new Server(server, { path: "/wss/" });

            wsServer.on("connection", (socket) => {
                console.log("Client connected");
                socket.on("disconnect", () => {
                    console.log("Client disconnected");
                });
            });
        },
        (path) => /wss/.test(path),
    );
