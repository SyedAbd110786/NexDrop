package com.nexdrop.app;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.activity.result.ActivityResultLauncher;
import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;
import com.nexdrop.app.utils.SocketManager;
import org.json.JSONObject;
import java.io.IOException;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class OfflineActivity extends AppCompatActivity {
    private final OkHttpClient client = new OkHttpClient();
    private final ActivityResultLauncher<ScanOptions> qrScanLauncher =
        registerForActivityResult(new ScanContract(), result -> {
            if (result.getContents() != null) handleScannedUrl(result.getContents());
            else Toast.makeText(this, "Scan cancelled", Toast.LENGTH_SHORT).show();
        });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_offline);
        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
        findViewById(R.id.btn_scan_qr).setOnClickListener(v -> startQrScan());
    }

    private void startQrScan() {
        ScanOptions options = new ScanOptions()
            .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            .setPrompt("Scan the QR code on your PC screen")
            .setCameraId(0).setBeepEnabled(true).setOrientationLocked(true);
        qrScanLauncher.launch(options);
    }

    private void handleScannedUrl(String url) {
        Toast.makeText(this, "Connecting to PC...", Toast.LENGTH_SHORT).show();
        Request request = new Request.Builder().url(url).build();
        client.newCall(request).enqueue(new Callback() {
            @Override public void onFailure(Call call, IOException e) {
                runOnUiThread(() -> Toast.makeText(OfflineActivity.this,
                    "Cannot reach PC. Make sure you are on the same WiFi!", Toast.LENGTH_LONG).show());
            }
            @Override public void onResponse(Call call, Response response) throws IOException {
                try {
                    String body = response.body().string();
                    JSONObject json = new JSONObject(body);
                    if ("offline".equals(json.optString("mode"))) {
                        String socketUrl = json.getString("socketUrl");
                        runOnUiThread(() -> connectToLocalServer(socketUrl));
                    } else {
                        runOnUiThread(() -> Toast.makeText(OfflineActivity.this,
                            "Invalid QR code", Toast.LENGTH_LONG).show());
                    }
                } catch (Exception e) {
                    runOnUiThread(() -> Toast.makeText(OfflineActivity.this,
                        "Failed: " + e.getMessage(), Toast.LENGTH_LONG).show());
                }
            }
        });
    }

    private void connectToLocalServer(String socketUrl) {
        SocketManager sm = SocketManager.getInstance();
        sm.connect(socketUrl);
        sm.addRegisteredListener(deviceId -> runOnUiThread(() -> sm.generatePairingCode()));
        sm.addPairingSuccessListener((pairedDeviceId, pairedDeviceName) ->
            runOnUiThread(() -> {
                getSharedPreferences("nexdrop_prefs", MODE_PRIVATE)
                    .edit().putBoolean("is_paired", true)
                    .putBoolean("offline_mode", true).apply();
                startActivity(new Intent(this, ChatActivity.class));
                finish();
            }));
    }
}
