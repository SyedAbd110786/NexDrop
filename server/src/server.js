require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const fileRoutes = require("./routes/files");
const deviceRoutes = require("./routes/devices");
const registerSocketHandlers = require("./socket/handlers");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 100 * 1024 * 1024, // 100MB max file size
});

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

const PORT = process.env.PORT || 5000;

// Routes
app.use("/api/files", fileRoutes);
app.use("/api/devices", deviceRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "NexDrop server is running", version: "1.0.0" });
});

app.get("/offline-connect", (req, res) => {
  const socketUrl = `http://${req.hostname}:${PORT}`;
  // #region agent log
  try {
    const fs = require("fs");
    const path = require("path");
    const logLine = JSON.stringify({
      sessionId: "d0cfc0",
      location: "server.js:offline-connect",
      message: "offline-connect ok",
      data: { hostname: req.hostname, port: PORT, socketUrl, ip: req.ip },
      timestamp: Date.now(),
      hypothesisId: "F",
      runId: "verify",
    }) + "\n";
    fs.appendFileSync(path.join(__dirname, "../../debug-d0cfc0.log"), logLine);
  } catch (_) { /* ignore */ }
  // #endregion
  res.json({
    status: "NexDrop local server",
    mode: "offline",
    version: "1.0.0",
    socketUrl,
    message: "Connected to PC local server"
  });
});

// Socket.io handlers
registerSocketHandlers(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ NexDrop server running on port ${PORT}`);
});
