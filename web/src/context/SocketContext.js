import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { detectLocalIP, isHostedDeploy, isPrivateIP } from "../utils/network";

const SocketContext = createContext(null);
const ONLINE_SERVER = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

async function probeLocalServer(ip) {
  const url = `http://${ip}:5000/offline-connect`;
  const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.mode !== "offline" || !data.socketUrl) throw new Error("Invalid offline server");
  return data.socketUrl;
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
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
    setConnected(false);

    const s = io(serverUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      setOfflineError(null);
      s.emit("device:register", { deviceName: "My PC", deviceType: "pc" });
    });
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", (err) => {
      setConnected(false);
      const msg = err?.message || "Connection failed";
      if (modeRef.current === "offline") {
        setOfflineError(
          `Cannot reach ${serverUrl}. Start the server: node server/src/server.js (${msg})`
        );
      }
    });
    s.on("device:registered", ({ deviceId }) => setDeviceId(deviceId));
    s.on("pairing:success", ({ pairedDevice }) => setPairedDevice(pairedDevice));
    s.on("device:disconnected", () => setPairedDevice(null));
    s.on("pairing:code:available", ({ sessionCode }) => {
      if (modeRef.current !== "offline") return;
      s.emit("pairing:join", { sessionCode });
    });
  }

  async function switchToOffline(manualIP) {
    setMode("offline");
    modeRef.current = "offline";
    setPairedDevice(null);
    setConnected(false);
    setOfflineError(null);

    const hosted = isHostedDeploy(window.location.hostname);
    let ip = manualIP?.trim() || null;

    if (ip && !isPrivateIP(ip)) {
      setOfflineError("Enter a valid LAN IP (e.g. 192.168.1.5 from ipconfig)");
      setLocalIP(null);
      return;
    }

    if (!ip) ip = await detectLocalIP();

    if (!ip) {
      setOfflineError(
        hosted
          ? "On Vercel: enter your PC's WiFi IP below (ipconfig), with node server/src/server.js running. Or open http://localhost:3000 on this PC instead."
          : "Could not detect WiFi IP. Run node server/src/server.js, then enter your IP below (ipconfig)."
      );
      setLocalIP(null);
      return;
    }

    try {
      await probeLocalServer(ip);
    } catch (e) {
      setLocalIP(ip);
      setOfflineError(
        `No server at http://${ip}:5000. On this PC run: node server/src/server.js — then click Apply again.`
      );
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
      socket, connected, deviceId,
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
