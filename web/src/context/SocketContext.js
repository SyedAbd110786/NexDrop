import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  canUseOfflineFromBrowser,
  detectLocalIP,
  isHostedDeploy,
  isPrivateIP,
} from "../utils/network";

const SocketContext = createContext(null);
const ONLINE_SERVER = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

async function probeLocalServer(ip) {
  const res = await fetch(`http://${ip}:5000/offline-connect`, {
    method: "GET",
    signal: AbortSignal.timeout(4000),
  });
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
  const [pairingCode, setPairingCode] = useState(null);
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
          `Cannot reach ${serverUrl}. Run: npm run server — allow port 5000 in Windows Firewall if prompted. (${msg})`
        );
      }
    });
    s.on("device:registered", ({ deviceId }) => {
      setDeviceId(deviceId);
      s.emit("pairing:generate");
    });
    s.on("pairing:code", ({ sessionCode }) => {
      setPairingCode(sessionCode);
    });
    s.on("pairing:success", ({ pairedDevice }) => setPairedDevice(pairedDevice));
    s.on("device:disconnected", () => setPairedDevice(null));
    s.on("pairing:code:available", ({ sessionCode }) => {
      if (modeRef.current !== "offline") return;
      s.emit("pairing:join", { sessionCode });
    });
  }

  async function switchToOffline(manualIP) {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
    setMode("offline");
    modeRef.current = "offline";
    setPairedDevice(null);
    setConnected(false);
    setOfflineError(null);

    if (!canUseOfflineFromBrowser()) {
      setOfflineError(
        "Offline mode cannot run on the HTTPS Vercel site (browser security). On this PC: run npm run server, then npm run web, and open http://localhost:3000 — see SETUP.md in the repo."
      );
      setLocalIP(null);
      return;
    }

    const hosted = isHostedDeploy(window.location.hostname);
    let ip = manualIP?.trim() || null;

    if (ip && !isPrivateIP(ip)) {
      setOfflineError("Enter a valid LAN IP (e.g. 192.168.1.5 from ipconfig)");
      setLocalIP(null);
      return;
    }

    if (!ip) {
      try {
        const res = await fetch("http://localhost:5000/api/local-ip", { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          if (data.ip) ip = data.ip;
        }
      } catch (err) {
        console.warn("Could not fetch IP from local server, trying WebRTC:", err);
      }
    }

    if (!ip) ip = await detectLocalIP();

    if (!ip) {
      setOfflineError(
        hosted
          ? "Enter your PC WiFi IP below (run ipconfig, use IPv4 Address)."
          : "Could not detect WiFi IP. Run ipconfig, enter IPv4 below, with npm run server running."
      );
      setLocalIP(null);
      return;
    }

    try {
      await probeLocalServer(ip);
    } catch {
      setLocalIP(ip);
      setOfflineError(
        `Server not running at http://${ip}:5000. In project folder run: npm run server — then click Apply.`
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
      socket, connected, deviceId, pairingCode,
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
