package com.nexdrop.app.models;

/**
 * Represents a single message in the chat.
 * Can be a text message or a file transfer notification.
 */
public class Message {

    public enum Type { TEXT, FILE }
    public enum Direction { SENT, RECEIVED }

    // Common fields
    public Type type;
    public Direction direction;
    public long timestamp;
    public String from;

    // Text message fields
    public String text;

    // File message fields
    public String fileName;
    public long fileSize;
    public String fileId;
    public String fileType;
    public int uploadProgress; // 0-100, used while sending
    public boolean isUploading;

    /** Create a sent text message */
    public static Message textSent(String text) {
        Message m = new Message();
        m.type = Type.TEXT;
        m.direction = Direction.SENT;
        m.text = text;
        m.timestamp = System.currentTimeMillis();
        return m;
    }

    /** Create a received text message */
    public static Message textReceived(String text, String from, long timestamp) {
        Message m = new Message();
        m.type = Type.TEXT;
        m.direction = Direction.RECEIVED;
        m.text = text;
        m.from = from;
        m.timestamp = timestamp;
        return m;
    }

    /** Create a sent file message (while uploading) */
    public static Message fileSending(String fileName, long fileSize, String fileType) {
        Message m = new Message();
        m.type = Type.FILE;
        m.direction = Direction.SENT;
        m.fileName = fileName;
        m.fileSize = fileSize;
        m.fileType = fileType;
        m.uploadProgress = 0;
        m.isUploading = true;
        m.timestamp = System.currentTimeMillis();
        return m;
    }

    /** Create a received file message */
    public static Message fileReceived(String fileName, long fileSize,
                                       String fileId, String fileType,
                                       String from, long timestamp) {
        Message m = new Message();
        m.type = Type.FILE;
        m.direction = Direction.RECEIVED;
        m.fileName = fileName;
        m.fileSize = fileSize;
        m.fileId = fileId;
        m.fileType = fileType;
        m.from = from;
        m.timestamp = timestamp;
        return m;
    }

    /** Format file size for display */
    public String getFormattedSize() {
        if (fileSize < 1024) return fileSize + " B";
        if (fileSize < 1024 * 1024) return String.format("%.1f KB", fileSize / 1024.0);
        return String.format("%.1f MB", fileSize / (1024.0 * 1024));
    }
}
