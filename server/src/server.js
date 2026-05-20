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

// Routes
app.use("/api/files", fileRoutes);
app.use("/api/devices", deviceRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "NexDrop server is running", version: "1.0.0" });
});

// Socket.io handlers
registerSocketHandlers(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ NexDrop server running on port ${PORT}`);
});
