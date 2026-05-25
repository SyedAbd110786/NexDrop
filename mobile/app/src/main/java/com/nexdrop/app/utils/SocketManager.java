package com.nexdrop.app.utils;

import android.util.Log;

import com.nexdrop.app.BuildConfig;

import org.json.JSONObject;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * Singleton that manages the Socket.IO connection to the NexDrop server.
 * All socket events and emissions go through this class.
 */
public class SocketManager {

    private static final String TAG = "SocketManager";
    private static SocketManager instance;

    private Socket socket;
    private String deviceId;
    private String pairedDeviceId;
    private String pairedDeviceName;
    private String serverUrl = BuildConfig.SERVER_URL;

    // Listeners — activities register these to get updates
    private final List<OnDeviceRegisteredListener> registeredListeners = new ArrayList<>();
    private final List<OnPairingSuccessListener> pairingSuccessListeners = new ArrayList<>();
    private final List<OnPairingCodeListener> pairingCodeListeners = new ArrayList<>();
    private final List<OnMessageReceivedListener> messageListeners = new ArrayList<>();
    private final List<OnFileIncomingListener> fileListeners = new ArrayList<>();
    private final List<OnDisconnectedListener> disconnectedListeners = new ArrayList<>();

    // Listener interfaces
    public interface OnDeviceRegisteredListener { void onRegistered(String deviceId); }
    public interface OnPairingSuccessListener { void onSuccess(String pairedDeviceId, String pairedDeviceName); }
    public interface OnPairingCodeListener { void onCode(String sessionCode); }
    public interface OnMessageReceivedListener { void onMessage(String text, String from, long timestamp); }
    public interface OnFileIncomingListener { void onFile(String fileName, long fileSize, String fileId, String fileType, String from, long timestamp); }
    public interface OnDisconnectedListener { void onDisconnected(String deviceName); }

    private SocketManager() {}

    public static SocketManager getInstance() {
        if (instance == null) instance = new SocketManager();
        return instance;
    }

    public void setServerUrl(String url) {
        this.serverUrl = url;
    }

    public String getServerUrl() {
        return serverUrl;
    }

    /** Connect to the NexDrop server */
    public void connect(String serverUrl) {
        this.serverUrl = serverUrl;
        if (socket != null && socket.connected()) return;
        try {
            IO.Options options = IO.Options.builder()
                    .setTransports(new String[]{"websocket"})
                    .setReconnection(true)
                    .setReconnectionAttempts(Integer.MAX_VALUE)
                    .setReconnectionDelay(1000)
                    .build();

            socket = IO.socket(URI.create(serverUrl), options);
            setupListeners();
            socket.connect();
            Log.d(TAG, "Connecting to " + serverUrl);
        } catch (Exception e) {
            Log.e(TAG, "Connection error: " + e.getMessage());
        }
    }

    private void setupListeners() {
        // Connected → register this device
        socket.on(Socket.EVENT_CONNECT, args -> {
            Log.d(TAG, "Socket connected");
            try {
                JSONObject data = new JSONObject();
                data.put("deviceName", android.os.Build.MODEL);
                data.put("deviceType", "mobile");
                socket.emit("device:register", data);
            } catch (Exception e) {
                Log.e(TAG, "Register error: " + e.getMessage());
            }
        });

        // Device registered — save our deviceId
        socket.on("device:registered", args -> {
            try {
                JSONObject data = (JSONObject) args[0];
                deviceId = data.getString("deviceId");
                Log.d(TAG, "Registered with ID: " + deviceId);
                for (OnDeviceRegisteredListener l : registeredListeners) l.onRegistered(deviceId);
            } catch (Exception e) {
                Log.e(TAG, "Register parse error: " + e.getMessage());
            }
        });

        // Pairing code generated
        socket.on("pairing:code", args -> {
            try {
                JSONObject data = (JSONObject) args[0];
                String code = data.getString("sessionCode");
                Log.d(TAG, "Pairing code: " + code);
                for (OnPairingCodeListener l : pairingCodeListeners) l.onCode(code);
            } catch (Exception e) {
                Log.e(TAG, "Pairing code error: " + e.getMessage());
            }
        });

        // Pairing successful
        socket.on("pairing:success", args -> {
            try {
                JSONObject data = (JSONObject) args[0];
                JSONObject paired = data.getJSONObject("pairedDevice");
                pairedDeviceId = paired.getString("deviceId");
                pairedDeviceName = paired.getString("deviceName");
                Log.d(TAG, "Paired with: " + pairedDeviceName);
                for (OnPairingSuccessListener l : pairingSuccessListeners)
                    l.onSuccess(pairedDeviceId, pairedDeviceName);
            } catch (Exception e) {
                Log.e(TAG, "Pairing success error: " + e.getMessage());
            }
        });

        // Text message received
        socket.on("message:receive", args -> {
            try {
                JSONObject data = (JSONObject) args[0];
                String text = data.getString("text");
                String from = data.getString("from");
                long timestamp = data.getLong("timestamp");
                for (OnMessageReceivedListener l : messageListeners) l.onMessage(text, from, timestamp);
            } catch (Exception e) {
                Log.e(TAG, "Message error: " + e.getMessage());
            }
        });

        // File incoming
        socket.on("file:incoming", args -> {
            try {
                JSONObject data = (JSONObject) args[0];
                String fileName = data.getString("fileName");
                long fileSize = data.getLong("fileSize");
                String fileId = data.getString("fileId");
                String fileType = data.getString("fileType");
                String from = data.getString("from");
                long timestamp = data.getLong("timestamp");
                for (OnFileIncomingListener l : fileListeners)
                    l.onFile(fileName, fileSize, fileId, fileType, from, timestamp);
            } catch (Exception e) {
                Log.e(TAG, "File incoming error: " + e.getMessage());
            }
        });

        // Paired device disconnected
        socket.on("device:disconnected", args -> {
            try {
                JSONObject data = (JSONObject) args[0];
                String name = data.getString("deviceName");
                pairedDeviceId = null;
                pairedDeviceName = null;
                for (OnDisconnectedListener l : disconnectedListeners) l.onDisconnected(name);
            } catch (Exception e) {
                Log.e(TAG, "Disconnect error: " + e.getMessage());
            }
        });
    }

    /** Ask server to generate a pairing code */
    public void generatePairingCode() {
        if (socket != null) socket.emit("pairing:generate");
    }

    /** Send a text message to paired device */
    public void sendMessage(String text) {
        try {
            JSONObject data = new JSONObject();
            data.put("text", text);
            socket.emit("message:send", data);
        } catch (Exception e) {
            Log.e(TAG, "Send message error: " + e.getMessage());
        }
    }

    /** Notify paired device that a file was uploaded */
    public void notifyFile(String fileName, long fileSize, String fileId, String fileType) {
        try {
            JSONObject data = new JSONObject();
            data.put("fileName", fileName);
            data.put("fileSize", fileSize);
            data.put("fileId", fileId);
            data.put("fileType", fileType);
            socket.emit("file:notify", data);
        } catch (Exception e) {
            Log.e(TAG, "Notify file error: " + e.getMessage());
        }
    }

    public boolean isConnected() { return socket != null && socket.connected(); }
    public boolean isPaired() { return pairedDeviceId != null; }
    public String getPairedDeviceName() { return pairedDeviceName; }

    // Register/unregister listeners
    public void addRegisteredListener(OnDeviceRegisteredListener l) { registeredListeners.add(l); }
    public void removeRegisteredListener(OnDeviceRegisteredListener l) { registeredListeners.remove(l); }
    public void addPairingSuccessListener(OnPairingSuccessListener l) { pairingSuccessListeners.add(l); }
    public void removePairingSuccessListener(OnPairingSuccessListener l) { pairingSuccessListeners.remove(l); }
    public void addPairingCodeListener(OnPairingCodeListener l) { pairingCodeListeners.add(l); }
    public void removePairingCodeListener(OnPairingCodeListener l) { pairingCodeListeners.remove(l); }
    public void addMessageListener(OnMessageReceivedListener l) { messageListeners.add(l); }
    public void removeMessageListener(OnMessageReceivedListener l) { messageListeners.remove(l); }
    public void addFileListener(OnFileIncomingListener l) { fileListeners.add(l); }
    public void removeFileListener(OnFileIncomingListener l) { fileListeners.remove(l); }
    public void addDisconnectedListener(OnDisconnectedListener l) { disconnectedListeners.add(l); }
    public void removeDisconnectedListener(OnDisconnectedListener l) { disconnectedListeners.remove(l); }
}
