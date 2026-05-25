import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { detectLocalIP, isHostedDeploy, isLocalHostname, isPrivateIP } from "../utils/network";

const SocketContext = createContext(null);
const ONLINE_SERVER = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";
const LOG_ENDPOINT = "http://127.0.0.1:7860/ingest/0450a8f0-1520-45c5-a34c-2040ffa7c1c0";

function debugLog(location, message, data, hypothesisId) {
  // #region agent log
  fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d0cfc0" },
    body: JSON.stringify({
      sessionId: "d0cfc0",
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
      runId: "offline-fix",
    }),
  }).catch(() => {});
  // #endregion
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [pairedDevice, setPairedDevice] = useState(null);
  const [mode, setMode] = useState("online");
  const [localIP, setLocalIP] = useState(null);
  const [offlineError, setOfflineError] = useState(null);
  const [activeServerUrl, setActiveServerUrl] = useState(ONLINE_SERVER);
  const modeRef = useRef("online");

  function connectSocket(serverUrl) {
    if (socketRef.current) socketRef.current.disconnect();
    setActiveServerUrl(serverUrl);
    debugLog("SocketContext.js:connectSocket", "connecting", { serverUrl, hostname: window.location.hostname }, "B");

    const socket = io(serverUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setOfflineError(null);
      debugLog("SocketContext.js:connect", "socket connected", { serverUrl }, "B");
      socket.emit("device:register", { deviceName: "My PC", deviceType: "pc" });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (err) => {
      setConnected(false);
      const msg = err?.message || "Connection failed";
      setOfflineError(
        modeRef.current === "offline"
          ? `Cannot reach local server at ${serverUrl}. Run "node server/src/server.js" on this PC, then retry. (${msg})`
          : null
      );
      debugLog("SocketContext.js:connect_error", "socket failed", { serverUrl, msg }, "B");
    });
    socket.on("device:registered", ({ deviceId }) => setDeviceId(deviceId));
    socket.on("pairing:success", ({ pairedDevice }) => setPairedDevice(pairedDevice));
    socket.on("device:disconnected", () => setPairedDevice(null));
    socket.on("pairing:code:available", ({ sessionCode }) => {
      if (modeRef.current !== "offline") return;
      socket.emit("pairing:join", { sessionCode });
    });
  }

  async function switchToOffline(manualIP) {
    setMode("offline");
    modeRef.current = "offline";
    setPairedDevice(null);
    setConnected(false);
    setOfflineError(null);

    const hostname = window.location.hostname;
    const hosted = isHostedDeploy(hostname);
    let ip = manualIP?.trim() || null;

    if (ip && !isPrivateIP(ip) && !isLocalHostname(ip)) {
      setOfflineError("Enter a valid LAN IP (e.g. 192.168.1.5)");
      setLocalIP(null);
      return;
    }

    if (!ip) {
      ip = await detectLocalIP();
    }

    debugLog("SocketContext.js:switchToOffline", "IP detection result", { hostname, hosted, ip, manual: !!manualIP }, "A");

    if (!ip) {
      if (hosted) {
        setOfflineError(
          "Offline mode does not work on the Vercel website. On this PC: run the server (node server/src/server.js), open http://localhost:3000, then use Offline Mode — or enter your PC's WiFi IP below."
        );
      } else {
        setOfflineError(
          "Could not detect your PC's WiFi IP. Run the server locally, then enter your IP below (find it with ipconfig — look for IPv4 on Wi-Fi)."
        );
      }
      setLocalIP(null);
      return;
    }

    setLocalIP(ip);
    connectSocket(`http://${ip}:5000`);
  }

  function switchToOnline() {
    setMode("online");
    modeRef.current = "online";
    setPairedDevice(null);
    setConnected(false);
    setLocalIP(null);
    setOfflineError(null);
    connectSocket(ONLINE_SERVER);
  }

  useEffect(() => {
    connectSocket(ONLINE_SERVER);
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current, connected, deviceId,
      pairedDevice, setPairedDevice, mode, localIP, offlineError, activeServerUrl,
      switchToOffline, switchToOnline,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
