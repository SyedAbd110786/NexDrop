package com.nexdrop.app;

import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.nexdrop.app.utils.SocketManager;

/**
 * Shows a 6-character pairing code and QR code.
 * The user on the PC types this code to connect.
 * Once paired, automatically opens ChatActivity.
 */
public class PairActivity extends AppCompatActivity {

    private TextView tvCode;
    private TextView tvStatus;
    private ImageView ivQrCode;
    private View btnGenerate;

    private final SocketManager sm = SocketManager.getInstance();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pair);

        tvCode      = findViewById(R.id.tv_code);
        tvStatus    = findViewById(R.id.tv_status);
        ivQrCode    = findViewById(R.id.iv_qr_code);
        btnGenerate = findViewById(R.id.btn_generate);

        // Generate button — ask server for a pairing code
        btnGenerate.setOnClickListener(v -> {
            if (!sm.isConnected()) {
                Toast.makeText(this, "Not connected to server yet…", Toast.LENGTH_SHORT).show();
                return;
            }
            sm.generatePairingCode();
            tvStatus.setText("Waiting for PC to connect…");
        });

        // Register listeners
        sm.addRegisteredListener(deviceId -> runOnUiThread(() -> {
            tvStatus.setText("Connected to server. Tap to generate code.");
            btnGenerate.setEnabled(true);
        }));

        sm.addPairingCodeListener(code -> runOnUiThread(() -> {
            tvCode.setText(code);
            tvCode.setVisibility(View.VISIBLE);
            ivQrCode.setVisibility(View.VISIBLE);
            generateQrCode(code);
        }));

        sm.addPairingSuccessListener((pairedDeviceId, pairedDeviceName) ->
                runOnUiThread(() -> {
                    Toast.makeText(this,
                            "✅ Connected to " + pairedDeviceName, Toast.LENGTH_SHORT).show();
                    startActivity(new Intent(this, ChatActivity.class));
                    finish();
                }));

        // Initial state
        if (!sm.isConnected()) {
            tvStatus.setText("Connecting to server…");
            btnGenerate.setEnabled(false);
        } else {
            tvStatus.setText("Tap to generate code.");
            btnGenerate.setEnabled(true);
        }
    }

    /**
     * Generate a QR code bitmap from the pairing code string
     * and display it in the ImageView.
     */
    private void generateQrCode(String content) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, 512, 512);
            int width = matrix.getWidth();
            int height = matrix.getHeight();
            Bitmap bmp = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
            for (int x = 0; x < width; x++) {
                for (int y = 0; y < height; y++) {
                    bmp.setPixel(x, y, matrix.get(x, y)
                            ? 0xFF111214   // dark pixels → NexDrop text color
                            : 0xFFF7F8FA); // light pixels → NexDrop bg color
                }
            }
            ivQrCode.setImageBitmap(bmp);
        } catch (WriterException e) {
            Toast.makeText(this, "Could not generate QR code", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        sm.removePairingCodeListener(code -> {});
        sm.removeRegisteredListener(id -> {});
    }
}
