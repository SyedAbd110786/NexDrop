import { useState } from "react";
import { useSocket } from "../context/SocketContext";

export default function PairScreen() {
  const { socket, connected } = useSocket();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleJoin() {
    if (code.length < 6) { setError("Enter the 6-character code from your phone"); return; }
    setLoading(true);
    setError("");
    socket.emit("pairing:join", { sessionCode: code.toUpperCase() });

    socket.once("pairing:error", ({ message }) => {
      setError(message);
      setLoading(false);
    });
  }

  return (
    <div className="pair-screen">
      <div className="pair-card">
        <div className="pair-brand">
          <span className="brand-nex">Nex</span>
          <span className="brand-drop">Drop</span>
        </div>
        <p className="pair-subtitle">Enter the code shown on your phone to connect</p>

        <input
          className="pair-input"
          maxLength={6}
          placeholder="ABC123"
          value={code}
          onChange={e => { setCode(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
        />

        {error && (
          <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 10 }}>{error}</p>
        )}

        <button className="pair-btn" onClick={handleJoin} disabled={!connected || loading}>
          {loading ? "Connecting..." : connected ? "Connect" : "Connecting to server..."}
        </button>

        <p className="pair-hint">
          Open <strong>NexDrop</strong> on your phone →<br />
          Tap <strong>Connect to PC</strong> → Tap <strong>Show code</strong><br />
          Enter the 6-character code above
        </p>
      </div>
    </div>
  );
}
