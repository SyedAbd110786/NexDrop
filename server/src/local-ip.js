const os = require("os");

/**
 * Detect the PC's local IPv4 address.
 * Returns the first non-internal IPv4 address found on any active
 * network interface (Wi-Fi, Ethernet, Mobile Hotspot, etc.).
 * Returns "127.0.0.1" as fallback if nothing else is found.
 */
function getLocalIPv4() {
  const interfaces = os.networkInterfaces();

  // Preferred interface name patterns (ordered by priority)
  const preferred = ["wi-fi", "wifi", "wlan", "ethernet", "eth", "en0", "en1"];

  // First pass: try preferred interfaces
  for (const pref of preferred) {
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (name.toLowerCase().includes(pref)) {
        for (const addr of addrs) {
          if (addr.family === "IPv4" && !addr.internal) {
            return addr.address;
          }
        }
      }
    }
  }

  // Second pass: any non-internal IPv4
  for (const addrs of Object.values(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }

  return "127.0.0.1";
}

module.exports = { getLocalIPv4 };
