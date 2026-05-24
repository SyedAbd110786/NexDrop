import { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";

function QRCodeImage({ value, size = 200 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`;
  return (
    <img src={url} alt="QR Code" width={size} height={size}
      style={{ borderRadius: 12, border: "1px solid var(--border)" }} />
  );
}

export default function PairScreen() {
  const { socket, connected, mode, localIP, switchToOffline, switchToOnline } = useSocket();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("home");

  const offlineUrl = localIP ? `http://${localIP}:5000/offline-connect` : null;

  function handleJoin() {
    if (code.length < 6) { setError("Enter the 6-character code from your phone"); return; }
    setLoading(true);
    setError("");
    socket.emit("pairing:join", { sessionCode: code.toUpperCase() });
    socket.once("pairing:error", ({ message }) => { setError(message); setLoading(false); });
  }

  function handleOfflineMode() { setView("offline"); switchToOffline(); }
  function handleOnlineMode() { setView("online"); switchToOnline(); }
  function handleBack() { setView("home"); switchToOnline(); setCode(""); setError(""); }

  const cardStyle = {
    background: "var(--bg)", border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "16px",
    marginBottom: "12px", cursor: "pointer", textAlign: "left",
  };

  if (view === "home") return (
    <div className="pair-screen">
      <div className="pair-card">
        <div className="pair-brand">
          <span className="brand-nex">Nex</span>
          <span className="brand-drop">Drop</span>
        </div>
        <p className="pair-subtitle">Choose how to connect your phone</p>
        <div style={cardStyle} onClick={handleOfflineMode}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <span style={{ fontSize:22 }}>📶</span>
            <span style={{ fontSize:14, fontWeight:600, color:"var(--text)" }}>Offline Mode</span>
            <span style={{ background:"#E6F1FB", color:"var(--blue)", fontSize:10,
              fontWeight:600, padding:"2px 8px", borderRadius:20, marginLeft:"auto" }}>
              RECOMMENDED
            </span>
          </div>
          <p style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.6 }}>
            No internet needed. Phone scans QR code shown on this screen. Works like Zapya on local WiFi.
          </p>
        </div>
        <div style={cardStyle} onClick={handleOnlineMode}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <span style={{ fontSize:22 }}>🌐</span>
            <span style={{ fontSize:14, fontWeight:600, color:"var(--text)" }}>Online Mode</span>
          </div>
          <p style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.6 }}>
            Works over internet. Connect from anywhere using a pairing code.
          </p>
        </div>
      </div>
    </div>
  );

  if (view === "offline") return (
    <div className="pair-screen">
      <div className="pair-card">
        <button onClick={handleBack} style={{ background:"none", border:"none",
          color:"var(--blue)", cursor:"pointer", fontSize:13, marginBottom:12 }}>
          ← Back
        </button>
        <div className="pair-brand">
          <span className="brand-nex">Nex</span><span className="brand-drop">Drop</span>
        </div>
        <div style={{ display:"inline-flex", alignItems:"center", gap:5,
          background:"#E6F1FB", color:"var(--blue)", fontSize:11, fontWeight:600,
          padding:"4px 12px", borderRadius:20, margin:"8px 0 16px" }}>
          📶 Offline Mode — No internet needed
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          {offlineUrl ? (
            <>
              <QRCodeImage value={offlineUrl} size={180} />
              <p style={{ fontSize:12, color:"var(--text-2)", textAlign:"center", lineHeight:1.6 }}>
                Open <strong>NexDrop</strong> on your phone<br />
                Tap <strong>Offline Mode → Scan QR Code from PC</strong><br />
                Make sure phone is on <strong>same WiFi</strong>
              </p>
              <div style={{ background:"var(--bg)", border:"1px solid var(--border)",
                borderRadius:8, padding:"8px 14px", fontSize:11,
                color:"var(--text-3)", fontFamily:"monospace" }}>
                {offlineUrl}
              </div>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"20px 0", fontSize:13, color:"var(--text-3)" }}>
              Detecting local IP address...
            </div>
          )}
          <div style={{ width:"100%", padding:"10px 14px",
            background: connected ? "#EAF3DE" : "#FFF3E0",
            borderRadius:10, fontSize:12,
            color: connected ? "#3B6D11" : "#854F0B", textAlign:"center" }}>
            {connected ? "✅ Local server ready — waiting for phone..." : "⏳ Starting local server..."}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pair-screen">
      <div className="pair-card">
        <button onClick={handleBack} style={{ background:"none", border:"none",
          color:"var(--blue)", cursor:"pointer", fontSize:13, marginBottom:12 }}>
          ← Back
        </button>
        <div className="pair-brand">
          <span className="brand-nex">Nex</span><span className="brand-drop">Drop</span>
        </div>
        <div style={{ display:"inline-flex", alignItems:"center", gap:5,
          background:"#E6F1FB", color:"var(--blue)", fontSize:11, fontWeight:600,
          padding:"4px 12px", borderRadius:20, margin:"8px 0 16px" }}>
          🌐 Online Mode
        </div>
        <p className="pair-subtitle">Enter the code shown on your phone</p>
        <input className="pair-input" maxLength={6} placeholder="ABC123" value={code}
          onChange={e => { setCode(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleJoin()} />
        {error && <p style={{ fontSize:12, color:"var(--red)", marginBottom:10 }}>{error}</p>}
        <button className="pair-btn" onClick={handleJoin} disabled={!connected || loading}>
          {loading ? "Connecting..." : connected ? "Connect" : "Connecting to server..."}
        </button>
        <p className="pair-hint">
          Open <strong>NexDrop</strong> on your phone →<br />
          Tap <strong>Online Mode → Show code</strong><br />
          Enter the 6-character code above
        </p>
      </div>
    </div>
  );
}
