import { useServer } from "vite-sveltekit-node-ws";
import { Server, Socket } from "socket.io";

import { deleteOldTokens, userExists, getUsername } from "$lib/auth";

import { BlackjackGame } from "./BlackjackGame";

let blackjackGames: Map<string, BlackjackGame> = new Map();

let connectedUsers: Map<Socket, string> = new Map();

export const websocketServer = () =>
    useServer(
        (server) => {
            const wsServer = new Server(server, { path: "/wss/" });

            wsServer.on("connection", (socket: Socket) => {
                console.log("Client connected");
                socket.on("disconnect", () => {
                    const user = connectedUsers.get(socket);
                    if (user && blackjackGames.has(user)) {
                        blackjackGames.delete(user);
                    }

                    if (connectedUsers.has(socket)) {
                        connectedUsers.delete(socket);
                    }
                    console.log("Client disconnected");
                });

                socket.on("auth", async (data) => {
                    if (await userExists(data)) {
                        const username = await getUsername(data);
                        for (const [s, u] of connectedUsers) {
                            if (u === username) {
                                connectedUsers.delete(s);
                            }
                        }

                        if (username) {
                            connectedUsers.set(socket, username);
                        }
                    }
                });

                socket.on("onlineUsers", () => {
                    const users = Array.from(connectedUsers.values());
                    for (const user of users) {
                        socket.emit("output", [user]);
                    }
                });

                socket.on("blackjack", async (data) => {
                    const user = connectedUsers.get(socket);
                    if (!user) {
                        socket.emit("output", [
                            `\u001b[31mYou must be authenticated to play blackjack\u001b[0m`,
                        ]);
                        return;
                    }

                    if (data[0] === "startSolo") {
                        if (blackjackGames.has(user)) {
                            socket.emit("output", [
                                `\u001b[31mYou are already in a game\u001b[0m`,
                            ]);
                            return;
                        }

                        const game = new BlackjackGame(socket);
                        blackjackGames.set(user, game);
                        game.startGame();
                    } else if (data[0] === "startMulti") {
                        socket.emit("output", [
                            `\u001b[31mMultiplayer blackjack is not available yet\u001b[0m`,
                        ]);
                    } else if (data[0] === "hit") {
                        const game = blackjackGames.get(user);
                        if (!game) {
                            socket.emit("output", [
                                `\u001b[31mYou are not in a game\u001b[0m`,
                            ]);
                            return;
                        }

                        game.hit();

                        if (game.isOver) {
                            blackjackGames.delete(user);
                        }
                    } else if (data[0] === "stand") {
                        const game = blackjackGames.get(user);
                        if (!game) {
                            socket.emit("output", [
                                `\u001b[31mYou are not in a game\u001b[0m`,
                            ]);
                            return;
                        }

                        game.stand();

                        if (game.isOver) {
                            blackjackGames.delete(user);
                        }
                    }
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
