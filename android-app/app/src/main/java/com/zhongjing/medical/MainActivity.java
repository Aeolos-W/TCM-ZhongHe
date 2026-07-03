package com.zhongjing.medical;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.core.app.ActivityCompat;
import android.Manifest;
import android.content.pm.PackageManager;
import org.json.JSONArray;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * MainActivity - Hosts the TCM Medical Records Web App in a WebView.
 * Provides JavaScript Bridge for file operations, export (share to WeChat),
 * and import (file picker).
 */
@SuppressLint("SetJavaScriptEnabled")
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "Zhongjing";
    private static final String BASE_URL = "https://app.zhongjing.local/";
    private static final int REQUEST_CODE_IMPORT = 1001;

    private WebView webView;
    private ProgressBar progressBar;
    private File baseDir;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        baseDir = getFilesDir();
        new File(baseDir, "records").mkdirs();

        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);

        setupWebView();
        webView.loadUrl(BASE_URL);
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);

        // Disable overscroll glow for smoother scrolling
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        // Register JS Bridge
        webView.addJavascriptInterface(new ZhongjingBridge(), "AndroidBridge");

        // Intercept asset requests
        webView.setWebViewClient(new WebViewClient() {
            @Nullable
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith(BASE_URL)) {
                    return serveAsset(url.substring(BASE_URL.length()));
                }
                return super.shouldInterceptRequest(view, request);
            }
        });

        // Progress tracking
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                progressBar.setProgress(progress);
                if (progress == 100) {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });
    }

    @Nullable
    private WebResourceResponse serveAsset(String path) {
        if (path.isEmpty() || "/".equals(path)) {
            path = "index.html";
        }
        if (!path.contains(".") || path.endsWith("/")) {
            path = "index.html";
        }

        String assetPath = "www/" + path;
        try {
            InputStream is = getAssets().open(assetPath);
            return new WebResourceResponse(getMimeType(path), "UTF-8", is);
        } catch (IOException e) {
            if (!"index.html".equals(path)) {
                try {
                    return new WebResourceResponse("text/html", "UTF-8", getAssets().open("www/index.html"));
                } catch (IOException ignored) {}
            }
            Log.w(TAG, "Asset not found: " + assetPath);
            return null;
        }
    }

    private String getMimeType(String path) {
        int dot = path.lastIndexOf('.');
        if (dot > 0 && dot < path.length() - 1) {
            switch (path.substring(dot + 1).toLowerCase()) {
                case "html": case "htm": return "text/html";
                case "js": return "application/javascript";
                case "css": return "text/css";
                case "json": return "application/json";
                case "png": return "image/png";
                case "jpg": case "jpeg": return "image/jpeg";
                case "gif": return "image/gif";
                case "svg": return "image/svg+xml";
                case "ico": return "image/x-icon";
                case "woff": return "font/woff";
                case "woff2": return "font/woff2";
                case "ttf": return "font/ttf";
            }
        }
        return "text/html";
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // ============================================================
    // Handle import file picker result
    // ============================================================
    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_CODE_IMPORT && resultCode == Activity.RESULT_OK && data != null) {
            // Handle multiple file selection
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                for (int i = 0; i < count; i++) {
                    Uri uri = data.getClipData().getItemAt(i).getUri();
                    if (uri != null) {
                        handleImportFile(uri);
                    }
                }
            } else {
                Uri uri = data.getData();
                if (uri != null) {
                    handleImportFile(uri);
                }
            }
        }
    }

    private void handleImportFile(Uri uri) {
        new Thread(() -> {
            try {
                InputStream is = getContentResolver().openInputStream(uri);
                if (is == null) {
                    runOnUiThread(() -> Toast.makeText(this, "无法打开文件", Toast.LENGTH_SHORT).show());
                    return;
                }
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buffer = new byte[4096];
                int len;
                while ((len = is.read(buffer)) != -1) {
                    baos.write(buffer, 0, len);
                }
                is.close();
                String content = baos.toString("UTF-8");
                String fileName = getFileName(uri);

                // Escape for JavaScript
                String escaped = content
                    .replace("\\", "\\\\")
                    .replace("'", "\\'")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r");
                String escapedFileName = fileName
                    .replace("\\", "\\\\")
                    .replace("'", "\\'");

                // Detect if it's a JSON (medical records) or text (book)
                boolean isJson = content.trim().startsWith("{") || content.trim().startsWith("[");

                runOnUiThread(() -> {
                    if (isJson) {
                        // Medical records import
                        webView.evaluateJavascript(
                            "if (window.onImportComplete) { window.onImportComplete('" + escaped + "'); }",
                            null
                        );
                    } else {
                        // Book import (MD/TXT)
                        webView.evaluateJavascript(
                            "if (window.onBookImportComplete) { window.onBookImportComplete('" + escapedFileName + "', '" + escaped + "'); }",
                            null
                        );
                    }
                    Toast.makeText(this, "正在导入《" + fileName + "》...", Toast.LENGTH_SHORT).show();
                });
            } catch (IOException e) {
                Log.e(TAG, "Import error", e);
                runOnUiThread(() -> Toast.makeText(this, "导入失败: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private String getFileName(Uri uri) {
        String result = null;
        if (uri.getScheme().equals("content")) {
            try (android.database.Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                    if (idx >= 0) result = cursor.getString(idx);
                }
            }
        }
        if (result == null) {
            result = uri.getLastPathSegment();
        }
        return result != null ? result : "unknown";
    }

    // ============================================================
    // JavaScript Bridge
    // ============================================================
    public class ZhongjingBridge {

        private File resolveFile(String path) {
            String safePath = path.replace("..", "").replace("//", "/");
            if (safePath.startsWith("/")) {
                safePath = safePath.substring(1);
            }
            return new File(baseDir, safePath);
        }

        @JavascriptInterface
        public String getBasePath() {
            return baseDir.getAbsolutePath();
        }

        @JavascriptInterface
        public String readFile(String path) {
            try {
                File file = resolveFile(path);
                if (!file.exists()) return null;
                byte[] bytes = new byte[(int) file.length()];
                FileInputStream fis = new FileInputStream(file);
                fis.read(bytes);
                fis.close();
                return new String(bytes, StandardCharsets.UTF_8);
            } catch (IOException e) {
                Log.e(TAG, "readFile error: " + path, e);
                return null;
            }
        }

        @JavascriptInterface
        public boolean writeFile(String path, String content) {
            try {
                File file = resolveFile(path);
                File parent = file.getParentFile();
                if (parent != null && !parent.exists()) {
                    parent.mkdirs();
                }
                FileOutputStream fos = new FileOutputStream(file);
                fos.write(content.getBytes(StandardCharsets.UTF_8));
                fos.close();
                return true;
            } catch (IOException e) {
                Log.e(TAG, "writeFile error: " + path, e);
                return false;
            }
        }

        @JavascriptInterface
        public boolean deleteFile(String path) {
            try {
                return resolveFile(path).delete();
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public String listFiles(String dirPath) {
            try {
                File dir = resolveFile(dirPath);
                if (!dir.exists() || !dir.isDirectory()) {
                    return "[]";
                }
                String[] files = dir.list();
                if (files == null) return "[]";
                JSONArray jsonArray = new JSONArray();
                for (String f : files) {
                    jsonArray.put(f);
                }
                return jsonArray.toString();
            } catch (Exception e) {
                return "[]";
            }
        }

        @JavascriptInterface
        public boolean fileExists(String path) {
            return resolveFile(path).exists();
        }

        @JavascriptInterface
        public void showToast(String message) {
            new Handler(Looper.getMainLooper()).post(() -> {
                Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
            });
        }

        // ========== Export: Save + Share via system share panel ==========
        @JavascriptInterface
        public void exportData(String jsonContent) {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    // Save to cache dir for sharing
                    File cacheDir = new File(getCacheDir(), "exports");
                    cacheDir.mkdirs();
                    String fileName = "仲景医案录_导出_" + System.currentTimeMillis() + ".json";
                    File exportFile = new File(cacheDir, fileName);
                    FileOutputStream fos = new FileOutputStream(exportFile);
                    fos.write(jsonContent.getBytes(StandardCharsets.UTF_8));
                    fos.close();

                    // Get content URI via FileProvider
                    Uri contentUri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getPackageName() + ".fileprovider",
                        exportFile
                    );

                    // Create share intent
                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                    shareIntent.setType("application/json");
                    shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    shareIntent.putExtra(Intent.EXTRA_SUBJECT, "仲景医案录数据导出");
                    shareIntent.putExtra(Intent.EXTRA_TEXT, "这是我的中医医案数据库导出文件");
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    // Show share chooser (includes WeChat)
                    Intent chooser = Intent.createChooser(shareIntent, "分享到");
                    startActivity(chooser);

                    Toast.makeText(MainActivity.this, "正在打开分享面板...", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Log.e(TAG, "Export error", e);
                    Toast.makeText(MainActivity.this, "导出失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }

        // ========== Import: Open system file picker (supports multiple selection) ==========
        @JavascriptInterface
        public void importData() {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "*/*"});
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(intent, REQUEST_CODE_IMPORT);
                } catch (Exception e) {
                    Log.e(TAG, "Import picker error", e);
                    Toast.makeText(MainActivity.this, "无法打开文件选择器", Toast.LENGTH_SHORT).show();
                }
            });
        }

        // ========== Hot Update: Download and install APK ==========
        @JavascriptInterface
        public void installApk(String apkUrl) {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    Toast.makeText(MainActivity.this, "开始下载更新...", Toast.LENGTH_SHORT).show();

                    // Use DownloadManager for reliable APK download
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
                    request.setTitle("仲景医案录 更新");
                    request.setDescription("正在下载新版本...");
                    request.setMimeType("application/vnd.android.package-archive");
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "zhongjing_update.apk");
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setAllowedOverMetered(true);
                    request.setAllowedOverRoaming(true);

                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    long downloadId = dm.enqueue(request);

                    // Register receiver to auto-install when download completes
                    BroadcastReceiver onComplete = new BroadcastReceiver() {
                        @Override
                        public void onReceive(Context context, Intent intent) {
                            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                            if (id != downloadId) return;
                            unregisterReceiver(this);

                            Cursor cursor = dm.query(new DownloadManager.Query().setFilterById(downloadId));
                            if (cursor != null && cursor.moveToFirst()) {
                                int statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                                int uriIdx = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
                                if (statusIdx >= 0 && uriIdx >= 0 && cursor.getInt(statusIdx) == DownloadManager.STATUS_SUCCESSFUL) {
                                    String localUri = cursor.getString(uriIdx);
                                    cursor.close();
                                    installApkFromUri(Uri.parse(localUri));
                                } else {
                                    cursor.close();
                                    Toast.makeText(MainActivity.this, "下载失败", Toast.LENGTH_SHORT).show();
                                }
                            }
                        }
                    };
                    registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));

                } catch (Exception e) {
                    Log.e(TAG, "Install APK error", e);
                    Toast.makeText(MainActivity.this, "更新失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }

        private void installApkFromUri(Uri apkUri) {
            try {
                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(installIntent);
            } catch (Exception e) {
                Log.e(TAG, "Install APK from URI error", e);
                Toast.makeText(MainActivity.this, "安装失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        }
    }
}
