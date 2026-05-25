/** RFC1918 + link-local */
export function isPrivateIP(ip) {
  if (!ip || typeof ip !== "string") return false;
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  return false;
}

export function isLocalHostname(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (isPrivateIP(h)) return true;
  return false;
}

/** Hosted static deploy (Vercel, Netlify, etc.) cannot run offline/local server */
export function isHostedDeploy(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return (
    h.endsWith(".vercel.app") ||
    h.endsWith(".netlify.app") ||
    h.endsWith(".github.io") ||
    h.includes("vercel") ||
    (!isLocalHostname(h) && !isPrivateIP(h) && h.includes("."))
  );
}

/**
 * Discover LAN IPv4 via WebRTC. Returns null if only a public hostname is available.
 */
export function detectLocalIP() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ip) => {
      if (settled) return;
      settled = true;
      try { pc?.close(); } catch (_) { /* ignore */ }
      resolve(ip);
    };

    const hostname = window.location.hostname;
    if (isPrivateIP(hostname)) {
      finish(hostname);
      return;
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pc.createDataChannel("nexdrop");
    pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => finish(null));

    pc.onicecandidate = (ice) => {
      if (!ice?.candidate?.candidate) return;
      const match = ice.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (match && isPrivateIP(match[1])) finish(match[1]);
    };

    setTimeout(() => finish(null), 5000);
  });
}
