import { useServer } from "vite-sveltekit-node-ws";
import { Server, Socket } from "socket.io";

import { deleteOldTokens, userExists, getUsername } from "$lib/auth";

import { BlackjackGame } from "./BlackjackGame";
import { ExpiringMap } from "./ExpiringMap";

import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

interface BlackjackRoom {
    owner: string;
    players: string[];
}

let blackjackGames: Map<BlackjackRoom, BlackjackGame> = new Map();

let connectedUsers: Map<Socket, string> = new Map();

let pendingInvites: ExpiringMap<string, BlackjackGame> = new ExpiringMap(
    (key, value) => {
        value.writeOutputToAll(
            `\u001b[31mInvite to ${key} has expired\u001b[0m`,
        );

        let socket: Socket | undefined = undefined;
        for (const [s, u] of connectedUsers) {
            if (u === key) {
                socket = s;
                break;
            }
        }

        socket?.emit("blackjack", "expired");
    },
);

function getPlayerGame(user: string) {
    for (const [room, game] of blackjackGames) {
        if (room.players.includes(user)) {
            return game;
        }
    }

    return null;
}

export const websocketServer = () =>
    useServer(
        (server) => {
            const wsServer = new Server(server, { path: "/wss/" });

            wsServer.on("connection", (socket: Socket) => {
                console.log("Client connected");
                socket.on("disconnect", () => {
                    // just delete the whole game for now since we don't have a way to remove individual players
                    const user = connectedUsers.get(socket);

                    if (user) {
                        for (const [room, game] of blackjackGames) {
                            const game = blackjackGames.get(room);
                            if (game) {
                                game.writeOutputToAll(
                                    `\u001b[31m${user} has disconnected\u001b[0m`,
                                );
                                game.removePlayer(user);

                                if (game.connectedUsers.size === 0) {
                                    blackjackGames.delete(room);
                                }

                                room.players = room.players.filter(
                                    (player) => player !== user,
                                );
                            }
                            break;
                        }
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

                    const game = getPlayerGame(user);

                    if (data[0] === "create") {
                        if (game) {
                            socket.emit("output", [
                                `\u001b[31mYou are already in a game\u001b[0m`,
                            ]);
                            return;
                        }

                        const newGame = new BlackjackGame(user);
                        const room = { owner: user, players: [user] };

                        blackjackGames.set(room, newGame);

                        newGame.addPlayer(socket, user);

                        socket.emit("output", [
                            `\u001b[32mGame created\u001b[0m`,
                        ]);

                        return;
                    } else if (data[0] === "accept") {
                        const game = pendingInvites.get(user);

                        if (!game) {
                            socket.emit("output", [
                                `\u001b[31mYou do not have any pending invites\u001b[0m`,
                            ]);
                            return;
                        }

                        pendingInvites.delete(user);

                        const room = Array.from(blackjackGames.keys()).find(
                            (room) => room.owner === game.owner,
                        );

                        if (room) {
                            room.players.push(user);
                            game.addPlayer(socket, user);
                            game.writeOutputToAll(
                                `\u001b[32m${user} has joined the game\u001b[0m`,
                            );
                        }

                        return;
                    }

                    if (!game) {
                        socket.emit("output", [
                            `\u001b[31mYou are not in a game\u001b[0m`,
                        ]);
                        return;
                    }

                    if (data[0] === "invite") {
                        if (game.owner !== user) {
                            socket.emit("output", [
                                `\u001b[31mOnly the owner can invite players\u001b[0m`,
                            ]);
                            return;
                        }

                        const player = data[1];

                        if (game.connectedUsers.has(player)) {
                            socket.emit("output", [
                                `\u001b[31m${player} is already in the game\u001b[0m`,
                            ]);
                            return;
                        }

                        if (
                            !Array.from(connectedUsers.values()).includes(
                                player,
                            )
                        ) {
                            socket.emit("output", [
                                `\u001b[31m${player} is not online\u001b[0m`,
                            ]);
                            return;
                        }

                        game.writeOutputToAll(
                            `\u001b[33m${user} has invited ${player} to the game\u001b[0m`,
                        );

                        pendingInvites.set(player, game);

                        let socketInvited: Socket | undefined = undefined;

                        for (const [s, u] of connectedUsers) {
                            if (u === player) {
                                socketInvited = s;
                                break;
                            }
                        }

                        socketInvited?.emit("blackjack", "invite");

                        socketInvited?.emit("output", [
                            `\u001b[33m${user} has invited you to a game. Type accept to join. Or type decline.\u001b[0m`,
                        ]);

                        socket.emit("output", [
                            `\u001b[34mInvite sent to ${player}\u001b[0m`,
                        ]);
                    } else if (data[0] === "decline") {
                        const game = pendingInvites.get(user);

                        if (!game) {
                            socket.emit("output", [
                                `\u001b[31mYou do not have any pending invites\u001b[0m`,
                            ]);
                            return;
                        }

                        pendingInvites.delete(user);

                        game.writeOutputToAll(
                            `\u001b[31m${user} has declined the invite\u001b[0m`,
                        );

                        socket.emit("output", [
                            `\u001b[31mInvite declined\u001b[0m`,
                        ]);
                    } else if (data[0] === "start") {
                        if (game.owner !== user) {
                            socket.emit("output", [
                                `\u001b[31mOnly the owner can start the game\u001b[0m`,
                            ]);
                            return;
                        }

                        game.startGame();
                    } else if (data[0] === "hit") {
                        game.hit(user);
                    } else if (data[0] === "stand") {
                        game.stand(user);
                    } else if (data[0] === "playersInGame") {
                        for (const player of game.connectedUsers.values()) {
                            socket.emit("output", [
                                `\u001b[37m${player.username}\u001b[0m`,
                            ]);
                        }
                    } else if (data[0] === "stop") {
                        if (game.owner !== user) {
                            socket.emit("output", [
                                `\u001b[31mOnly the owner can stop the game\u001b[0m`,
                            ]);
                            return;
                        }

                        game.writeOutputToAll(`\u001b[31mGame ended\u001b[0m`);

                        for (const [room, g] of blackjackGames) {
                            if (g === game) {
                                blackjackGames.delete(room);
                                break;
                            }
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

                const keyPair = nacl.box.keyPair();
                let sharedKey: Uint8Array | undefined = undefined;

                socket.on("ssh", (message: string) => {
                    const data = JSON.parse(message);
                    switch (data.type) {
                        case "key":
                            const key = naclUtil.decodeBase64(data.key);
                            sharedKey = nacl.box.before(key, keyPair.secretKey);
                            socket.emit("ssh", {
                                type: "key",
                                key: naclUtil.encodeBase64(keyPair.publicKey),
                            });
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
