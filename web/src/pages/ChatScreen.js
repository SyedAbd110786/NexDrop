import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useSocket } from "../context/SocketContext";

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getFileIcon(name = "", type = "") {
  if (type.startsWith("image/")) return { icon: "ti-photo", cls: "img" };
  if (type.startsWith("video/")) return { icon: "ti-video", cls: "vid" };
  if (name.endsWith(".pdf")) return { icon: "ti-file-text", cls: "pdf" };
  if (name.endsWith(".zip") || name.endsWith(".rar")) return { icon: "ti-file-zip", cls: "zip" };
  return { icon: "ti-file", cls: "def" };
}

export default function ChatScreen() {
  const { socket, pairedDevice, activeServerUrl } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [history, setHistory] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState("");
  const [uploadProgress, setUploadProgress] = useState({});
  const [activeTab, setActiveTab] = useState("chat");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stats
  const sentCount = history.filter(h => h.direction === "sent").length;
  const totalBytes = history.reduce((acc, h) => acc + (h.fileSize || 0), 0);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on("message:receive", ({ text, from, timestamp }) => {
      setMessages(prev => [...prev, { type: "text", dir: "received", text, from, timestamp }]);
    });

    socket.on("file:incoming", ({ fileName, fileSize, fileId, fileType, from, timestamp }) => {
      setMessages(prev => [...prev, { type: "file", dir: "received", fileName, fileSize, fileId, fileType, from, timestamp }]);
      setHistory(prev => [{ fileName, fileSize, fileType, direction: "received", timestamp }, ...prev]);
      showToast(`📥 ${fileName} received`);
    });

    return () => {
      socket.off("message:receive");
      socket.off("file:incoming");
    };
  }, [socket, activeServerUrl]);

  function sendText() {
    if (!text.trim()) return;
    socket.emit("message:send", { text });
    setMessages(prev => [...prev, { type: "text", dir: "sent", text, timestamp: Date.now() }]);
    setText("");
  }

  const uploadFile = useCallback(async (file) => {
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { type: "file", dir: "sent", fileName: file.name, fileSize: file.size, fileType: file.type, tempId, progress: 0, timestamp: Date.now() }]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${activeServerUrl}/api/files/upload`, formData, {
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 100);
          setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, progress: pct } : m));
        },
      });

      const { fileId, fileName, fileSize, fileType } = res.data;
      setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, fileId, progress: 100, tempId: undefined } : m));
      socket.emit("file:notify", { fileName, fileSize, fileId, fileType });
      setHistory(prev => [{ fileName, fileSize, fileType, direction: "sent", timestamp: Date.now() }, ...prev]);
      showToast(`✅ ${fileName} sent`);
    } catch {
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
      showToast("❌ Upload failed");
    }
  }, [socket, activeServerUrl]);

  function handleFiles(files) {
    Array.from(files).forEach(uploadFile);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function downloadFile(msg) {
    window.open(
      `${activeServerUrl}/api/files/download/${msg.fileId}/${encodeURIComponent(msg.fileName)}`,
      "_blank"
    );
  }

  return (
    <div
      className="app"
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="drop-overlay">
          <span className="drop-overlay-text">Drop files to send</span>
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <span className="brand">
            <span className="brand-nex">Nex</span>
            <span className="brand-drop">Drop</span>
          </span>
          <button className="icon-btn" title="Settings"><i className="ti ti-settings" /></button>
        </div>

        <div className="sidebar-search">
          <i className="ti ti-search" style={{ fontSize: 14 }} />
          <input placeholder="Search devices..." />
        </div>

        <div className="section-label">Connected</div>
        <div className="device-item active">
          <div className="d-avatar blue"><i className="ti ti-device-mobile" /></div>
          <div className="d-info">
            <div className="d-name">{pairedDevice?.deviceName || "My Phone"}</div>
            <div className="d-sub online">Online</div>
          </div>
          <div className="status-dot on" />
        </div>

        <button className="add-device-btn" onClick={() => showToast("Open NexDrop on your phone to connect")}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} />
          Add another device
        </button>

        <div className="sidebar-bottom">
          <button className={`nav-btn ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>
            <i className="ti ti-message" />Chat
          </button>
          <button className={`nav-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
            <i className="ti ti-history" />History
          </button>
          <button className="nav-btn"><i className="ti ti-settings" />Settings</button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="main">
        <div className="chat-header">
          <div className="chat-device-avatar"><i className="ti ti-device-mobile" /></div>
          <div>
            <div className="chat-device-name">{pairedDevice?.deviceName || "Phone"}</div>
            <div className="chat-device-status">Connected</div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" title="Open downloads folder"><i className="ti ti-folder-open" /></button>
            <button className="icon-btn" title="More"><i className="ti ti-dots" /></button>
          </div>
        </div>

        <div className="messages">
          <div className="date-chip">Today</div>
          {messages.length === 0 && (
            <div className="empty-state">
              <i className="ti ti-transfer" />
              <p>Send a file or message to get started</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`msg-row ${msg.dir}`}>
              {msg.type === "text" ? (
                <div className={`bubble ${msg.dir}`}>
                  {msg.text}
                  <div className="bubble-time">{formatTime(msg.timestamp)}</div>
                </div>
              ) : (
                <div
                  className={`file-bubble ${msg.dir}`}
                  onClick={() => msg.dir === "received" && msg.fileId && downloadFile(msg)}
                >
                  <div className="file-icon-box">
                    <i className={`ti ${getFileIcon(msg.fileName, msg.fileType).icon}`} />
                  </div>
                  <div>
                    <div className="file-name">{msg.fileName}</div>
                    <div className="file-meta">
                      {formatSize(msg.fileSize)}
                      {msg.dir === "sent" && msg.progress !== undefined && msg.progress < 100 && " · Sending..."}
                      {msg.dir === "sent" && msg.progress === 100 && " · Sent"}
                      {msg.dir === "received" && " · Tap to download"}
                    </div>
                    {msg.progress !== undefined && msg.progress < 100 && (
                      <div className="progress-wrap">
                        <div className="progress-fill" style={{ width: `${msg.progress}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-bar">
          <input type="file" ref={fileInputRef} style={{ display: "none" }} multiple onChange={e => handleFiles(e.target.files)} />
          <button className="icon-btn" onClick={() => fileInputRef.current.click()} title="Attach file"><i className="ti ti-paperclip" /></button>
          <button className="icon-btn" onClick={() => fileInputRef.current.click()} title="Send photo"><i className="ti ti-photo" /></button>
          <input
            className="msg-input"
            placeholder="Type a message or drop files here..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendText()}
          />
          <button className="send-btn" onClick={sendText}><i className="ti ti-arrow-up" /></button>
        </div>
      </div>

      {/* Right panel */}
      <div className="right-panel">
        <div className="rp-header">History</div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-val">{sentCount}</div><div className="stat-lbl">Sent</div></div>
          <div className="stat-card"><div className="stat-val">{formatSize(totalBytes)}</div><div className="stat-lbl">Total</div></div>
        </div>
        <div className="section-label">Recent</div>
        {history.length === 0 && (
          <p style={{ fontSize: 11, color: "var(--text-3)", padding: "8px 14px" }}>No transfers yet</p>
        )}
        {history.slice(0, 20).map((h, i) => {
          const { icon, cls } = getFileIcon(h.fileName, h.fileType);
          return (
            <div key={i} className="hist-item">
              <div className={`h-icon ${cls}`}><i className={`ti ${icon}`} /></div>
              <div>
                <div className="h-name">{h.fileName}</div>
                <div className="h-meta">{formatSize(h.fileSize)} · {h.direction}</div>
              </div>
            </div>
          );
        })}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
