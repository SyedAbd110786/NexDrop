import { useState } from "react";
import { useSocket } from "../context/SocketContext";
import { canUseOfflineFromBrowser, isHostedDeploy } from "../utils/network";

function QRCodeImage({ value, size = 200 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`;
  return (
    <img src={url} alt="QR Code" width={size} height={size}
      style={{ borderRadius: 12, border: "1px solid var(--border)" }} />
  );
}

export default function PairScreen() {
  const { socket, connected, localIP, pairingCode, activeServerUrl, offlineError, switchToOffline, switchToOnline } = useSocket();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("home");
  const [manualIP, setManualIP] = useState("");
  const [showManualCode, setShowManualCode] = useState(false);

  const canShowQr = localIP && !offlineError;
  const offlineUrl = canShowQr ? `http://${localIP}:5000/offline-connect${pairingCode ? `?code=${pairingCode}` : ""}` : null;
  const onHostedSite = isHostedDeploy(window.location.hostname);
  const offlineAllowed = canUseOfflineFromBrowser();

  function handleJoin() {
    if (code.length < 6) { setError("Enter the 6-character code from your phone"); return; }
    if (!socket?.connected) { setError("Not connected to server yet. Wait a moment and try again."); return; }
    setLoading(true);
    setError("");
    socket.emit("pairing:join", { sessionCode: code.toUpperCase() });
    socket.once("pairing:error", ({ message }) => { setError(message); setLoading(false); });
  }

  function handleOfflineMode() {
    if (!offlineAllowed) {
      setView("offline");
      switchToOffline();
      return;
    }
    setView("offline");
    switchToOffline();
  }

  function handleApplyManualIP() {
    switchToOffline(manualIP);
  }

  function handleOnlineMode() { setView("online"); switchToOnline(); }
  function handleBack() { setView("home"); switchToOnline(); setCode(""); setError(""); setManualIP(""); }

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
        {(!offlineAllowed || onHostedSite) && (
          <div style={{ background: "#FFF3E0", border: "1px solid #FFE0B2", borderRadius: 10,
            padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#854F0B", lineHeight: 1.5 }}>
            <strong>Offline mode</strong> only works at{" "}
            <code style={{ fontSize: 11 }}>http://localhost:3000</code> on your PC (not this HTTPS Vercel URL).
            See <strong>SETUP.md</strong> in the repo. Use <strong>Online Mode</strong> here.
          </div>
        )}
        <div
          style={{ ...cardStyle, opacity: offlineAllowed ? 1 : 0.55 }}
          onClick={handleOfflineMode}
        >
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <span style={{ fontSize:22 }}>📶</span>
            <span style={{ fontSize:14, fontWeight:600, color:"var(--text)" }}>Offline Mode</span>
            {!onHostedSite && (
              <span style={{ background:"#E6F1FB", color:"var(--blue)", fontSize:10,
                fontWeight:600, padding:"2px 8px", borderRadius:20, marginLeft:"auto" }}>
                RECOMMENDED
              </span>
            )}
          </div>
          <p style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.6 }}>
            Same WiFi only. Run the server on this PC, then scan the QR code from your phone.
          </p>
        </div>
        <div style={cardStyle} onClick={handleOnlineMode}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <span style={{ fontSize:22 }}>🌐</span>
            <span style={{ fontSize:14, fontWeight:600, color:"var(--text)" }}>Online Mode</span>
            {onHostedSite && (
              <span style={{ background:"#E6F1FB", color:"var(--blue)", fontSize:10,
                fontWeight:600, padding:"2px 8px", borderRadius:20, marginLeft:"auto" }}>
                USE ON VERCEL
              </span>
            )}
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
          📶 Offline Mode — Local WiFi
        </div>

        <ol style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7, margin: "0 0 14px 18px", padding: 0 }}>
          <li>On this PC, run: <code style={{ fontSize: 11 }}>node server/src/server.js</code></li>
          <li>Use this page at <code style={{ fontSize: 11 }}>localhost:3000</code> (not Vercel)</li>
          <li>Phone on same WiFi → Offline → Scan QR</li>
        </ol>

        {offlineError && (
          <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", borderRadius: 10,
            padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#B71C1C", lineHeight: 1.5 }}>
            {offlineError}
          </div>
        )}

        <div style={{ display:"flex", gap: 8, marginBottom: 12 }}>
          <input
            className="pair-input"
            placeholder="192.168.1.5"
            value={manualIP}
            onChange={(e) => setManualIP(e.target.value)}
            style={{ marginBottom: 0, flex: 1 }}
          />
          <button className="pair-btn" onClick={handleApplyManualIP} style={{ width: "auto", padding: "0 16px" }}>
            Apply
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          {offlineUrl ? (
            <>
              <QRCodeImage value={offlineUrl} size={180} />
              <p style={{ fontSize:12, color:"var(--text-2)", textAlign:"center", lineHeight:1.6 }}>
                Open <strong>NexDrop</strong> on your phone<br />
                Tap <strong>Offline Mode → Scan QR Code from PC</strong>
              </p>
              <div style={{ background:"var(--bg)", border:"1px solid var(--border)",
                borderRadius:8, padding:"8px 14px", fontSize:11,
                color:"var(--text-3)", fontFamily:"monospace" }}>
                {offlineUrl}
              </div>
            </>
          ) : !offlineError ? (
            <div style={{ textAlign:"center", padding:"20px 0", fontSize:13, color:"var(--text-3)" }}>
              Detecting local IP address...
            </div>
          ) : null}
          <div style={{ width:"100%", padding:"10px 14px",
            background: connected ? "#EAF3DE" : offlineError ? "#FFEBEE" : "#FFF3E0",
            borderRadius:10, fontSize:12,
            color: connected ? "#3B6D11" : offlineError ? "#B71C1C" : "#854F0B", textAlign:"center" }}>
            {connected
              ? "✅ Local server ready — waiting for phone..."
              : offlineError
                ? "❌ Fix the steps above, then Apply your PC IP"
                : "⏳ Connecting to local server..."}
          </div>
        </div>
      </div>
    </div>
  );

  const onlineQrValue = pairingCode ? `nexdrop://pair?code=${pairingCode}&server=${encodeURIComponent(activeServerUrl)}` : "";

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

        {showManualCode ? (
          <>
            <p className="pair-subtitle">Enter the code shown on your phone</p>
            <input className="pair-input" maxLength={6} placeholder="ABC123" value={code}
              onChange={e => { setCode(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleJoin()} />
            {error && <p style={{ fontSize:12, color:"var(--red)", marginBottom:10 }}>{error}</p>}
            <button className="pair-btn" onClick={handleJoin} disabled={!connected || loading}>
              {loading ? "Connecting..." : connected ? "Connect" : "Connecting to server..."}
            </button>
            <button onClick={() => setShowManualCode(false)} style={{ background:"none", border:"none",
              color:"var(--text-3)", cursor:"pointer", fontSize:11, marginTop:12, width:"100%" }}>
              ← Switch back to QR Code
            </button>
          </>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, marginTop:8 }}>
            {onlineQrValue ? (
              <>
                <QRCodeImage value={onlineQrValue} size={180} />
                <p style={{ fontSize:12, color:"var(--text-2)", textAlign:"center", lineHeight:1.6 }}>
                  Open <strong>NexDrop</strong> on your phone<br />
                  Tap <strong>Online Mode → Scan QR Code</strong>
                </p>
                <div style={{ background:"var(--bg)", border:"1px solid var(--border)",
                  borderRadius:8, padding:"6px 12px", fontSize:11,
                  color:"var(--text-3)", fontFamily:"monospace" }}>
                  Session Code: {pairingCode}
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"20px 0", fontSize:13, color:"var(--text-3)" }}>
                Generating pairing code...
              </div>
            )}
            <div style={{ width:"100%", padding:"10px 14px",
              background: connected ? "#EAF3DE" : "#FFEBEE",
              borderRadius:10, fontSize:12,
              color: connected ? "#3B6D11" : "#B71C1C", textAlign:"center", marginTop:8 }}>
              {connected
                ? "✅ Connected to server — waiting for phone..."
                : "⏳ Connecting to server..."}
            </div>
            <button onClick={() => setShowManualCode(true)} style={{ background:"none", border:"none",
              color:"var(--blue)", cursor:"pointer", fontSize:11, marginTop:8 }}>
              Can't scan? Enter code manually
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
