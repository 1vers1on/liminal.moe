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

                socket.on("manual", (data) => {
                    switch (data) {
                        case "blahaj":
                            socket.emit("output", [
                                "\u001b[37mblahaj - Display an image of Blahaj\u001b[0m",
                                "\u001b[37mUsage: blahaj\u001b[0m",
                            ]);
                            break;

                        default:
                            socket.emit("output", [
                                `\u001b[31mNo manual entry for ${data}\u001b[0m`,
                            ]);
                            break;
                    }
                });

                socket.on("command", (data) => {
                    switch (data[0]) {
                        case "blahaj":
                            socket.emit("output", [
                                '<img src="blahaj.png" alt="Blahaj" style="max-width: 400px; max-height: 400px;">',
                            ]);
                            break;
                        default:
                            socket.emit("output", [
                                `\u001b[31m${data[0]}: command not found\u001b[0m`,
                            ]);
                            break;
                    }
                });
            });
        },
        (path) => /wss/.test(path),
    );
