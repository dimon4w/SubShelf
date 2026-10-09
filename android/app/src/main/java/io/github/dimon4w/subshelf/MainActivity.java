package io.github.dimon4w.subshelf;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * Android scales WebView text with the system font size. The layout is designed for 85–130 %,
     * so larger settings are clamped to keep every label on one line.
     */
    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        float scale = getResources().getConfiguration().fontScale;
        int zoom = Math.round(Math.max(0.85f, Math.min(1.3f, scale)) * 100);
        webView.getSettings().setTextZoom(zoom);
    }
}
