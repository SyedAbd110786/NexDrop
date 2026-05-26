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

const { getLocalIPv4 } = require("./local-ip");

// Routes
app.use("/api/files", fileRoutes);
app.use("/api/devices", deviceRoutes);

app.get("/api/local-ip", (req, res) => {
  res.json({ ip: getLocalIPv4() });
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "NexDrop server is running", version: "1.0.0" });
});

app.get("/offline-connect", (req, res) => {
  const hostHeader = req.headers.host || "";
  const host = hostHeader.split(":")[0] || req.hostname || "127.0.0.1";
  const socketUrl = `http://${host}:${PORT}`;
  res.json({
    status: "NexDrop local server",
    mode: "offline",
    version: "1.0.0",
    socketUrl,
    code: req.query.code || null,
    message: "Connected to PC local server"
  });
});

// Serve React build static files
const buildDir = path.join(__dirname, "../../web/build");
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildDir, "index.html"));
  });
}

// Socket.io handlers
registerSocketHandlers(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ NexDrop server running on port ${PORT}`);
});
