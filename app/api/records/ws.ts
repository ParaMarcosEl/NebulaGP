/* eslint-disable @typescript-eslint/no-explicit-any */
// /pages/api/records/ws.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { WebSocketServer, WebSocket } from "ws";

// Store clients in memory (simple example)
const clients = new Set<WebSocket>();

// Fake in-memory data for demonstration
let recordCounter = 1;

export const config = {
  api: {
    bodyParser: false, // Important for WS upgrade
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((res as any).socket.server.wss) {
    console.log("✅ WebSocket server already running");
  } else {
    console.log("🚀 Starting WebSocket server...");

    const wss = new WebSocketServer({ noServer: true });

    // Handle upgrade from HTTP to WS
    (res as any).socket.server.on("upgrade", (request: any, socket: any, head: any) => {
      if (request.url.startsWith("/api/records/ws")) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    });

    wss.on("connection", (ws) => {
      console.log("🔌 Client connected");
      clients.add(ws);

      ws.on("close", () => {
        console.log("❌ Client disconnected");
        clients.delete(ws);
      });
    });

    // Simple example: send a new record every 10s
    setInterval(() => {
      const newRecord = {
        id: `rec-${recordCounter++}`,
        userId: "demo-user",
        trackId: "track-1",
        totalTime: Math.floor(Math.random() * 5000),
        lapTimes: [1000, 1200, 1300],
        createdAt: new Date().toISOString(),
      };

      broadcast({ type: "created", record: newRecord });
    }, 10000);

    // Broadcast helper
    function broadcast(message: unknown) {
      const data = JSON.stringify(message);
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      }
    }

    (res as any).socket.server.wss = wss;
  }
  res.end();
}
