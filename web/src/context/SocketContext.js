import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);
const SERVER = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [pairedDevice, setPairedDevice] = useState(null);

  useEffect(() => {
    const socket = io(SERVER, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      // Register as PC
      socket.emit("device:register", {
        deviceName: "My PC",
        deviceType: "pc",
      });
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setPairedDevice(null);
    });

    socket.on("device:registered", ({ deviceId }) => {
      setDeviceId(deviceId);
      localStorage.setItem("nexdrop_device_id", deviceId);
    });

    socket.on("pairing:success", ({ pairedDevice }) => {
      setPairedDevice(pairedDevice);
      localStorage.setItem("nexdrop_paired", JSON.stringify(pairedDevice));
    });

    socket.on("device:disconnected", ({ deviceName }) => {
      setPairedDevice(null);
      localStorage.removeItem("nexdrop_paired");
    });

    return () => socket.disconnect();
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, deviceId, pairedDevice, setPairedDevice }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
