package com.nexdrop.app.utils;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Log;

import com.nexdrop.app.BuildConfig;

import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Handles file upload to the NexDrop server and building download URLs.
 */
public class FileUtils {

    private static final String TAG = "FileUtils";
    private static final OkHttpClient client = new OkHttpClient();

    /** Callback for upload result */
    public interface UploadCallback {
        void onProgress(int percent);
        void onSuccess(String fileId, String fileName, long fileSize, String fileType);
        void onError(String message);
    }

    /**
     * Get the display name of a file from its URI.
     */
    public static String getFileName(Context context, Uri uri) {
        String result = null;
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = context.getContentResolver()
                    .query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (idx >= 0) result = cursor.getString(idx);
                }
            }
        }
        if (result == null) {
            result = uri.getPath();
            int cut = result != null ? result.lastIndexOf('/') : -1;
            if (cut != -1) result = result.substring(cut + 1);
        }
        return result != null ? result : "file";
    }

    /**
     * Get the file size from its URI.
     */
    public static long getFileSize(Context context, Uri uri) {
        try (Cursor cursor = context.getContentResolver()
                .query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (idx >= 0 && !cursor.isNull(idx)) return cursor.getLong(idx);
            }
        }
        return 0;
    }

    /**
     * Upload a file to the NexDrop server asynchronously.
     * Calls back on the calling thread — post UI updates with runOnUiThread().
     */
    public static void uploadFile(Context context, Uri fileUri,
                                   String fileName, UploadCallback callback) {
        new Thread(() -> {
            try {
                ContentResolver cr = context.getContentResolver();
                String mimeType = cr.getType(fileUri);
                if (mimeType == null) mimeType = "application/octet-stream";

                InputStream is = cr.openInputStream(fileUri);
                if (is == null) { callback.onError("Cannot open file"); return; }

                byte[] bytes = is.readAllBytes();
                is.close();

                // Build multipart request
                RequestBody fileBody = RequestBody.create(bytes,
                        MediaType.parse(mimeType));

                RequestBody requestBody = new MultipartBody.Builder()
                        .setType(MultipartBody.FORM)
                        .addFormDataPart("file", fileName, fileBody)
                        .build();

                // Wrap to track progress
                CountingRequestBody countingBody = new CountingRequestBody(
                        requestBody, (bytesWritten, contentLength) -> {
                    int percent = (int) (bytesWritten * 100 / contentLength);
                    callback.onProgress(percent);
                });

                String uploadUrl = SocketManager.getInstance().getServerUrl() + "/api/files/upload";
                Request request = new Request.Builder()
                        .url(uploadUrl)
                        .post(countingBody)
                        .build();

                Response response = client.newCall(request).execute();
                if (!response.isSuccessful()) {
                    callback.onError("Server error: " + response.code());
                    return;
                }

                String body = response.body().string();
                JSONObject json = new JSONObject(body);
                callback.onSuccess(
                        json.getString("fileId"),
                        json.getString("fileName"),
                        json.getLong("fileSize"),
                        json.getString("fileType")
                );

            } catch (Exception e) {
                Log.e(TAG, "Upload failed: " + e.getMessage());
                callback.onError(e.getMessage());
            }
        }).start();
    }

    /**
     * Build the download URL for a file.
     */
    public static String getDownloadUrl(String fileId, String fileName) {
        return SocketManager.getInstance().getServerUrl()
                + "/api/files/download/" + fileId + "/" + Uri.encode(fileName);
    }

    // ── CountingRequestBody — tracks upload progress ──
    interface ProgressListener {
        void onProgress(long bytesWritten, long contentLength);
    }

    static class CountingRequestBody extends RequestBody {
        private final RequestBody delegate;
        private final ProgressListener listener;

        CountingRequestBody(RequestBody delegate, ProgressListener listener) {
            this.delegate = delegate;
            this.listener = listener;
        }

        @Override
        public MediaType contentType() { return delegate.contentType(); }

        @Override
        public long contentLength() throws IOException { return delegate.contentLength(); }

        @Override
        public void writeTo(okio.BufferedSink sink) throws IOException {
            okio.BufferedSink countingSink = okio.Okio.buffer(new okio.ForwardingSink(sink) {
                long bytesWritten = 0;
                @Override
                public void write(okio.Buffer source, long byteCount) throws IOException {
                    super.write(source, byteCount);
                    bytesWritten += byteCount;
                    listener.onProgress(bytesWritten, contentLength());
                }
            });
            delegate.writeTo(countingSink);
            countingSink.flush();
        }
    }
}
