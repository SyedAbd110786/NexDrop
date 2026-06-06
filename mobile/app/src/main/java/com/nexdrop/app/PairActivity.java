package com.nexdrop.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.appcompat.app.AppCompatActivity;

import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;
import com.nexdrop.app.utils.SocketManager;

/**
 * Online pairing activity.
 * The phone scans the QR code generated on the PC web screen to pair.
 */
public class PairActivity extends AppCompatActivity {

    private TextView tvStatus;
    private Button btnScan;
    private final SocketManager sm = SocketManager.getInstance();

    private final ActivityResultLauncher<ScanOptions> qrScanLauncher =
            registerForActivityResult(new ScanContract(), result -> {
                if (result.getContents() != null) {
                    handleScannedCode(result.getContents());
                } else {
                    Toast.makeText(this, "Scan cancelled", Toast.LENGTH_SHORT).show();
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pair);

        tvStatus = findViewById(R.id.tv_status);
        btnScan = findViewById(R.id.btn_generate); // reuse R.id.btn_generate from layout
        
        // Update button text to match new flow
        btnScan.setText("Scan QR Code from PC");

        // Hide old code and QR views which are no longer needed on the phone side
        View tvCode = findViewById(R.id.tv_code);
        if (tvCode != null) tvCode.setVisibility(View.GONE);
        View ivQrCode = findViewById(R.id.iv_qr_code);
        if (ivQrCode != null) ivQrCode.setVisibility(View.GONE);

        btnScan.setOnClickListener(v -> {
            if (!sm.isConnected()) {
                Toast.makeText(this, "Not connected to server yet...", Toast.LENGTH_SHORT).show();
                return;
            }
            startQrScan();
        });

        // Register listeners
        sm.addRegisteredListener(deviceId -> runOnUiThread(() -> {
            tvStatus.setText("Connected to server. Ready to scan.");
            btnScan.setEnabled(true);
        }));

        sm.addPairingSuccessListener((pairedDeviceId, pairedDeviceName) ->
                runOnUiThread(() -> {
                    Toast.makeText(this,
                            "✅ Connected to " + pairedDeviceName, Toast.LENGTH_SHORT).show();
                    getSharedPreferences("nexdrop_prefs", MODE_PRIVATE)
                            .edit().putBoolean("is_paired", true)
                            .putBoolean("offline_mode", false).apply();
                    startActivity(new Intent(this, ChatActivity.class));
                    finish();
                }));

        // Initial state
        if (!sm.isConnected()) {
            tvStatus.setText("Connecting to server...");
            btnScan.setEnabled(false);
        } else {
            tvStatus.setText("Ready to scan.");
            btnScan.setEnabled(true);
        }
    }

    private void startQrScan() {
        ScanOptions options = new ScanOptions()
                .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                .setPrompt("Scan the QR code on your PC screen")
                .setCameraId(0)
                .setBeepEnabled(true)
                .setOrientationLocked(true);
        qrScanLauncher.launch(options);
    }

    private void handleScannedCode(String scanned) {
        String code = null;
        if (scanned.startsWith("nexdrop://pair?")) {
            try {
                Uri uri = Uri.parse(scanned);
                code = uri.getQueryParameter("code");
            } catch (Exception e) {
                Log.e("PairActivity", "Error parsing scanned URI: " + e.getMessage());
            }
        } else if (scanned.length() == 6) {
            code = scanned.toUpperCase();
        }

        if (code != null && !code.isEmpty()) {
            tvStatus.setText("Connecting/Pairing with PC...");
            sm.joinPairingSession(code);
        } else {
            Toast.makeText(this, "Invalid QR Code scanned", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        sm.removeRegisteredListener(null);
        sm.removePairingSuccessListener(null);
    }
}
