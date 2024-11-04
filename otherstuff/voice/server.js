const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const app = express();

// Serve static files from 'public' folder
app.use(express.static("public"));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server on top of HTTP server
const wss = new WebSocket.Server({ server });

// Store connected clients
let clients = [];

wss.on("connection", function connection(ws) {
    console.log("Client connected");
    clients.push(ws);
    ws.on("message", function incoming(message) {
        // Broadcast messages to other clients
        clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
    ws.on("close", function () {
        clients = clients.filter((client) => client !== ws);
    });
});

// Start the server on port 3000
server.listen(3001, function listening() {
    console.log("Server is listening on port 3000");
});
