import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);
const ONLINE_SERVER = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [pairedDevice, setPairedDevice] = useState(null);
  const [mode, setMode] = useState("online");
  const [localIP, setLocalIP] = useState(null);

  async function detectLocalIP() {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return;
        const match = ice.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (match && !match[1].startsWith("127.")) {
          resolve(match[1]);
          pc.close();
        }
      };
      setTimeout(() => resolve(window.location.hostname), 2000);
    });
  }

  function connectSocket(serverUrl) {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(serverUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("device:register", { deviceName: "My PC", deviceType: "pc" });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("device:registered", ({ deviceId }) => setDeviceId(deviceId));
    socket.on("pairing:success", ({ pairedDevice }) => setPairedDevice(pairedDevice));
    socket.on("device:disconnected", () => setPairedDevice(null));
  }

  async function switchToOffline() {
    setMode("offline");
    setPairedDevice(null);
    setConnected(false);
    const ip = await detectLocalIP();
    setLocalIP(ip);
    connectSocket(`http://${ip}:5000`);
  }

  function switchToOnline() {
    setMode("online");
    setPairedDevice(null);
    setConnected(false);
    setLocalIP(null);
    connectSocket(ONLINE_SERVER);
  }

  useEffect(() => {
    connectSocket(ONLINE_SERVER);
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current, connected, deviceId,
      pairedDevice, setPairedDevice, mode, localIP,
      switchToOffline, switchToOnline,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
