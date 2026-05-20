package com.nexdrop.app.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.nexdrop.app.R;
import com.nexdrop.app.models.Message;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * RecyclerView adapter that renders 4 view types:
 *   1. Sent text bubble
 *   2. Received text bubble
 *   3. Sent file card (with progress bar)
 *   4. Received file card (with download button)
 */
public class MessageAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int TYPE_TEXT_SENT     = 0;
    private static final int TYPE_TEXT_RECEIVED = 1;
    private static final int TYPE_FILE_SENT     = 2;
    private static final int TYPE_FILE_RECEIVED = 3;

    private final List<Message> messages;
    private final OnDownloadClickListener downloadListener;

    public interface OnDownloadClickListener {
        void onDownload(Message message);
    }

    public MessageAdapter(List<Message> messages, OnDownloadClickListener downloadListener) {
        this.messages = messages;
        this.downloadListener = downloadListener;
    }

    @Override
    public int getItemViewType(int position) {
        Message msg = messages.get(position);
        boolean sent = msg.direction == Message.Direction.SENT;
        if (msg.type == Message.Type.TEXT) {
            return sent ? TYPE_TEXT_SENT : TYPE_TEXT_RECEIVED;
        } else {
            return sent ? TYPE_FILE_SENT : TYPE_FILE_RECEIVED;
        }
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        switch (viewType) {
            case TYPE_TEXT_SENT:
                return new TextSentHolder(inflater.inflate(R.layout.item_msg_text_sent, parent, false));
            case TYPE_TEXT_RECEIVED:
                return new TextReceivedHolder(inflater.inflate(R.layout.item_msg_text_received, parent, false));
            case TYPE_FILE_SENT:
                return new FileSentHolder(inflater.inflate(R.layout.item_msg_file_sent, parent, false));
            default:
                return new FileReceivedHolder(inflater.inflate(R.layout.item_msg_file_received, parent, false));
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        Message msg = messages.get(position);
        String time = new SimpleDateFormat("HH:mm", Locale.getDefault())
                .format(new Date(msg.timestamp));

        if (holder instanceof TextSentHolder) {
            TextSentHolder h = (TextSentHolder) holder;
            h.tvText.setText(msg.text);
            h.tvTime.setText(time);

        } else if (holder instanceof TextReceivedHolder) {
            TextReceivedHolder h = (TextReceivedHolder) holder;
            h.tvText.setText(msg.text);
            h.tvTime.setText(time);

        } else if (holder instanceof FileSentHolder) {
            FileSentHolder h = (FileSentHolder) holder;
            h.tvName.setText(msg.fileName);
            h.tvMeta.setText(msg.getFormattedSize()
                    + (msg.isUploading ? " · Sending…" : " · Sent ✓"));
            h.progressBar.setVisibility(msg.isUploading ? View.VISIBLE : View.GONE);
            h.progressBar.setProgress(msg.uploadProgress);
            h.tvTime.setText(time);

        } else if (holder instanceof FileReceivedHolder) {
            FileReceivedHolder h = (FileReceivedHolder) holder;
            h.tvName.setText(msg.fileName);
            h.tvMeta.setText(msg.getFormattedSize() + " · Tap to download");
            h.tvTime.setText(time);
            h.itemView.setOnClickListener(v -> downloadListener.onDownload(msg));
        }
    }

    @Override
    public int getItemCount() { return messages.size(); }

    // ── ViewHolders ──
    static class TextSentHolder extends RecyclerView.ViewHolder {
        TextView tvText, tvTime;
        TextSentHolder(View v) {
            super(v);
            tvText = v.findViewById(R.id.tv_text);
            tvTime = v.findViewById(R.id.tv_time);
        }
    }

    static class TextReceivedHolder extends RecyclerView.ViewHolder {
        TextView tvText, tvTime;
        TextReceivedHolder(View v) {
            super(v);
            tvText = v.findViewById(R.id.tv_text);
            tvTime = v.findViewById(R.id.tv_time);
        }
    }

    static class FileSentHolder extends RecyclerView.ViewHolder {
        TextView tvName, tvMeta, tvTime;
        ProgressBar progressBar;
        FileSentHolder(View v) {
            super(v);
            tvName      = v.findViewById(R.id.tv_file_name);
            tvMeta      = v.findViewById(R.id.tv_file_meta);
            tvTime      = v.findViewById(R.id.tv_time);
            progressBar = v.findViewById(R.id.progress_bar);
        }
    }

    static class FileReceivedHolder extends RecyclerView.ViewHolder {
        TextView tvName, tvMeta, tvTime;
        FileReceivedHolder(View v) {
            super(v);
            tvName = v.findViewById(R.id.tv_file_name);
            tvMeta = v.findViewById(R.id.tv_file_meta);
            tvTime = v.findViewById(R.id.tv_time);
        }
    }
}
