package com.nexdrop.app;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.nexdrop.app.adapters.MessageAdapter;
import com.nexdrop.app.models.Message;
import com.nexdrop.app.utils.FileUtils;
import com.nexdrop.app.utils.SocketManager;

import java.util.ArrayList;
import java.util.List;

/**
 * Main screen of NexDrop.
 * Shows the chat between this phone and the paired PC.
 * Lets user send text messages, pick files, and receive files.
 */
public class ChatActivity extends AppCompatActivity {

    private RecyclerView rvMessages;
    private EditText etMessage;
    private TextView tvDeviceName;
    private TextView tvStatus;

    private MessageAdapter adapter;
    private final List<Message> messages = new ArrayList<>();
    private final SocketManager sm = SocketManager.getInstance();

    // File picker launcher
    private final ActivityResultLauncher<String[]> filePickerLauncher =
            registerForActivityResult(new ActivityResultContracts.OpenDocument(),
                    uri -> { if (uri != null) sendFile(uri); });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        // Bind views
        rvMessages   = findViewById(R.id.rv_messages);
        etMessage    = findViewById(R.id.et_message);
        tvDeviceName = findViewById(R.id.tv_device_name);
        tvStatus     = findViewById(R.id.tv_status);

        // Set up RecyclerView
        adapter = new MessageAdapter(messages, this::onDownloadFile);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        layoutManager.setStackFromEnd(true);       // newest messages at bottom
        rvMessages.setLayoutManager(layoutManager);
        rvMessages.setAdapter(adapter);

        // Device name in header
        String pairedName = sm.getPairedDeviceName();
        tvDeviceName.setText(pairedName != null ? pairedName : "My PC");
        tvStatus.setText("Connected");

        // Send text button
        findViewById(R.id.btn_send).setOnClickListener(v -> sendText());

        // Attach file button
        findViewById(R.id.btn_attach).setOnClickListener(v ->
                filePickerLauncher.launch(new String[]{"*/*"}));

        // History tab button
        findViewById(R.id.btn_history).setOnClickListener(v ->
                Toast.makeText(this, "History coming soon!", Toast.LENGTH_SHORT).show());

        // Disconnect button
        findViewById(R.id.btn_disconnect).setOnClickListener(v -> {
            // Clear paired state and go back to pair screen
            getSharedPreferences("nexdrop_prefs", MODE_PRIVATE)
                    .edit().putBoolean("is_paired", false).apply();
            startActivity(new Intent(this, PairActivity.class));
            finish();
        });

        registerSocketListeners();
    }

    /** Register all socket event listeners */
    private void registerSocketListeners() {
        // Received a text message from PC
        sm.addMessageListener((text, from, timestamp) ->
                runOnUiThread(() -> {
                    messages.add(Message.textReceived(text, from, timestamp));
                    adapter.notifyItemInserted(messages.size() - 1);
                    rvMessages.smoothScrollToPosition(messages.size() - 1);
                }));

        // Received a file notification from PC
        sm.addFileListener((fileName, fileSize, fileId, fileType, from, timestamp) ->
                runOnUiThread(() -> {
                    messages.add(Message.fileReceived(fileName, fileSize, fileId, fileType, from, timestamp));
                    adapter.notifyItemInserted(messages.size() - 1);
                    rvMessages.smoothScrollToPosition(messages.size() - 1);
                    Toast.makeText(this, "📥 " + fileName + " received!", Toast.LENGTH_SHORT).show();
                }));

        // PC disconnected
        sm.addDisconnectedListener(deviceName ->
                runOnUiThread(() -> {
                    tvStatus.setText("Disconnected");
                    Toast.makeText(this, deviceName + " disconnected", Toast.LENGTH_LONG).show();
                }));
    }

    /** Send a text message to the paired PC */
    private void sendText() {
        String text = etMessage.getText().toString().trim();
        if (text.isEmpty()) return;

        sm.sendMessage(text);
        messages.add(Message.textSent(text));
        adapter.notifyItemInserted(messages.size() - 1);
        rvMessages.smoothScrollToPosition(messages.size() - 1);
        etMessage.setText("");
    }

    /**
     * Upload a file chosen from the file picker.
     * Shows a progress message while uploading, then notifies the PC.
     */
    private void sendFile(Uri fileUri) {
        String fileName = FileUtils.getFileName(this, fileUri);
        long fileSize   = FileUtils.getFileSize(this, fileUri);
        String mimeType = getContentResolver().getType(fileUri);
        if (mimeType == null) mimeType = "application/octet-stream";

        // Add a "sending" placeholder message
        Message msg = Message.fileSending(fileName, fileSize, mimeType);
        messages.add(msg);
        int msgIndex = messages.size() - 1;
        adapter.notifyItemInserted(msgIndex);
        rvMessages.smoothScrollToPosition(msgIndex);

        final String finalMime = mimeType;

        FileUtils.uploadFile(this, fileUri, fileName, new FileUtils.UploadCallback() {
            @Override
            public void onProgress(int percent) {
                runOnUiThread(() -> {
                    msg.uploadProgress = percent;
                    adapter.notifyItemChanged(msgIndex);
                });
            }

            @Override
            public void onSuccess(String fileId, String fn, long fs, String ft) {
                runOnUiThread(() -> {
                    msg.fileId = fileId;
                    msg.isUploading = false;
                    msg.uploadProgress = 100;
                    adapter.notifyItemChanged(msgIndex);
                    // Tell the PC a file is ready
                    sm.notifyFile(fn, fs, fileId, ft);
                    Toast.makeText(ChatActivity.this,
                            "✅ " + fn + " sent!", Toast.LENGTH_SHORT).show();
                });
            }

            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    messages.remove(msgIndex);
                    adapter.notifyItemRemoved(msgIndex);
                    Toast.makeText(ChatActivity.this,
                            "❌ Upload failed: " + error, Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    /**
     * Download a received file using Android DownloadManager.
     * File will appear in the Downloads folder.
     */
    private void onDownloadFile(Message msg) {
        if (msg.fileId == null) return;
        String url = FileUtils.getDownloadUrl(msg.fileId, msg.fileName);
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
                    .setTitle(msg.fileName)
                    .setDescription("NexDrop download")
                    .setNotificationVisibility(
                            DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationInExternalPublicDir(
                            Environment.DIRECTORY_DOWNLOADS, msg.fileName)
                    .setAllowedOverMetered(true);

            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            dm.enqueue(request);
            Toast.makeText(this,
                    "⬇️ Downloading " + msg.fileName + "…", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this,
                    "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        sm.removeMessageListener(null);
        sm.removeFileListener(null);
        sm.removeDisconnectedListener(null);
    }
}
