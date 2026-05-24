package com.nexdrop.app;
import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.nexdrop.app.utils.SocketManager;
import com.nexdrop.app.BuildConfig;

public class HomeActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home);
        SocketManager.getInstance().connect(BuildConfig.SERVER_URL);
        findViewById(R.id.btn_online_mode).setOnClickListener(v -> {
            Intent intent = new Intent(this, PairActivity.class);
            intent.putExtra("mode", "online");
            startActivity(intent);
        });
        findViewById(R.id.btn_offline_mode).setOnClickListener(v ->
            startActivity(new Intent(this, OfflineActivity.class)));
    }
}
