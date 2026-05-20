const { v4: uuidv4 } = require("uuid");

// Store connected devices in memory
// { deviceId: { socketId, deviceName, deviceType, pairedWith } }
const connectedDevices = {};

// Store pairing sessions
// { sessionCode: { hostDeviceId, createdAt } }
const pairingSessions = {};

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);

    // ── Device registers itself ──
    socket.on("device:register", ({ deviceName, deviceType }) => {
      const deviceId = uuidv4();
      connectedDevices[deviceId] = {
        socketId: socket.id,
        deviceName: deviceName || "Unknown Device",
        deviceType: deviceType || "unknown", // 'mobile' | 'pc'
        pairedWith: null,
        deviceId,
      };
      socket.deviceId = deviceId;

      socket.emit("device:registered", { deviceId, deviceName, deviceType });
      console.log(`📱 Device registered: ${deviceName} (${deviceId})`);
    });

    // ── Generate a pairing code (mobile creates session) ──
    socket.on("pairing:generate", () => {
      const deviceId = socket.deviceId;
      if (!deviceId) return;

      const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      pairingSessions[sessionCode] = {
        hostDeviceId: deviceId,
        createdAt: Date.now(),
      };

      socket.emit("pairing:code", { sessionCode });
      console.log(`🔑 Pairing code generated: ${sessionCode} for device ${deviceId}`);

      // Expire session after 5 minutes
      setTimeout(() => {
        if (pairingSessions[sessionCode]) {
          delete pairingSessions[sessionCode];
          console.log(`⏰ Pairing session expired: ${sessionCode}`);
        }
      }, 5 * 60 * 1000);
    });

    // ── PC joins with pairing code ──
    socket.on("pairing:join", ({ sessionCode }) => {
      const session = pairingSessions[sessionCode];
      if (!session) {
        socket.emit("pairing:error", { message: "Invalid or expired code" });
        return;
      }

      const hostDevice = connectedDevices[session.hostDeviceId];
      const joiningDevice = connectedDevices[socket.deviceId];

      if (!hostDevice || !joiningDevice) {
        socket.emit("pairing:error", { message: "Device not found" });
        return;
      }

      // Pair the two devices
      hostDevice.pairedWith = socket.deviceId;
      joiningDevice.pairedWith = session.hostDeviceId;

      // Notify both
      const hostSocket = io.sockets.sockets.get(hostDevice.socketId);
      if (hostSocket) {
        hostSocket.emit("pairing:success", {
          pairedDevice: {
            deviceId: joiningDevice.deviceId,
            deviceName: joiningDevice.deviceName,
            deviceType: joiningDevice.deviceType,
          },
        });
      }

      socket.emit("pairing:success", {
        pairedDevice: {
          deviceId: hostDevice.deviceId,
          deviceName: hostDevice.deviceName,
          deviceType: hostDevice.deviceType,
        },
      });

      delete pairingSessions[sessionCode];
      console.log(`✅ Devices paired: ${hostDevice.deviceName} ↔ ${joiningDevice.deviceName}`);
    });

    // ── Send a text message ──
    socket.on("message:send", ({ text }) => {
      const sender = connectedDevices[socket.deviceId];
      if (!sender || !sender.pairedWith) return;

      const receiver = connectedDevices[sender.pairedWith];
      if (!receiver) return;

      const receiverSocket = io.sockets.sockets.get(receiver.socketId);
      if (receiverSocket) {
        receiverSocket.emit("message:receive", {
          text,
          from: sender.deviceName,
          timestamp: Date.now(),
        });
      }
    });

    // ── Notify paired device that a file was uploaded ──
    socket.on("file:notify", ({ fileName, fileSize, fileId, fileType }) => {
      const sender = connectedDevices[socket.deviceId];
      if (!sender || !sender.pairedWith) return;

      const receiver = connectedDevices[sender.pairedWith];
      if (!receiver) return;

      const receiverSocket = io.sockets.sockets.get(receiver.socketId);
      if (receiverSocket) {
        receiverSocket.emit("file:incoming", {
          fileName,
          fileSize,
          fileId,
          fileType,
          from: sender.deviceName,
          timestamp: Date.now(),
        });
      }

      console.log(`📁 File notification: ${fileName} from ${sender.deviceName}`);
    });

    // ── Handle disconnect ──
    socket.on("disconnect", () => {
      const deviceId = socket.deviceId;
      if (!deviceId) return;

      const device = connectedDevices[deviceId];
      if (device && device.pairedWith) {
        const pairedDevice = connectedDevices[device.pairedWith];
        if (pairedDevice) {
          const pairedSocket = io.sockets.sockets.get(pairedDevice.socketId);
          if (pairedSocket) {
            pairedSocket.emit("device:disconnected", {
              deviceName: device.deviceName,
            });
          }
          pairedDevice.pairedWith = null;
        }
      }

      delete connectedDevices[deviceId];
      console.log(`❌ Device disconnected: ${device?.deviceName || socket.id}`);
    });
  });
}

module.exports = registerSocketHandlers;
