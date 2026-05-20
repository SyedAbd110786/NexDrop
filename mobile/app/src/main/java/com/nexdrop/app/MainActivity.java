package com.nexdrop.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.nexdrop.app.utils.SocketManager;
import com.nexdrop.app.BuildConfig;

/**
 * Entry point of NexDrop.
 * Connects the socket and routes to PairActivity or ChatActivity.
 */
public class MainActivity extends AppCompatActivity {

    private static final String PREFS = "nexdrop_prefs";
    private static final String KEY_PAIRED = "is_paired";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Connect socket to server
        SocketManager sm = SocketManager.getInstance();
        sm.connect(BuildConfig.SERVER_URL);

        // Listen for pairing success → go to chat
        sm.addPairingSuccessListener((pairedDeviceId, pairedDeviceName) -> {
            // Save paired state
            getSharedPreferences(PREFS, MODE_PRIVATE)
                    .edit().putBoolean(KEY_PAIRED, true).apply();
            runOnUiThread(() -> goToChat());
        });

        // If already paired from a previous session, go straight to chat
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        boolean wasPaired = prefs.getBoolean(KEY_PAIRED, false);

        if (wasPaired && sm.isPaired()) {
            goToChat();
        } else {
            goToPair();
        }
    }

    private void goToPair() {
        startActivity(new Intent(this, PairActivity.class));
        finish();
    }

    private void goToChat() {
        startActivity(new Intent(this, ChatActivity.class));
        finish();
    }
}
