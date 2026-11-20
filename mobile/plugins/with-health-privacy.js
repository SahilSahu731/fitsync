const { withAndroidManifest, withDangerousMod, AndroidConfig } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

// Health Connect opens a native activity, including when React/Metro is not running.
// Generate that activity through CNG rather than editing generated Android files.
module.exports = function withHealthPrivacy(config, { privacyUrl = "" } = {}) {
  config = withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    main["intent-filter"] = (main["intent-filter"] ?? []).filter(
      (filter) =>
        !(filter.action ?? []).some(
          (action) =>
            action.$["android:name"] === "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE",
        ),
    );
    app.activity = (app.activity ?? []).filter(
      (activity) => activity.$["android:name"] !== ".HealthPrivacyActivity",
    );
    app.activity.push({
      $: {
        "android:name": ".HealthPrivacyActivity",
        "android:exported": "true",
        "android:theme": "@android:style/Theme.Material.NoActionBar",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" } }],
        },
      ],
    });
    app["activity-alias"] = (app["activity-alias"] ?? []).filter(
      (alias) => alias.$["android:name"] !== "ViewPermissionUsageActivity",
    );
    app["activity-alias"].push({
      $: {
        "android:name": "ViewPermissionUsageActivity",
        "android:exported": "true",
        "android:targetActivity": ".HealthPrivacyActivity",
        "android:permission": "android.permission.START_VIEW_PERMISSION_USAGE",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.intent.action.VIEW_PERMISSION_USAGE" } }],
          category: [{ $: { "android:name": "android.intent.category.HEALTH_PERMISSIONS" } }],
        },
      ],
    });
    return config;
  });
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const packageName = config.android.package;
      const folder = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/java",
        ...packageName.split("."),
      );
      await fs.mkdir(folder, { recursive: true });
      await fs.writeFile(
        path.join(folder, "HealthPrivacyActivity.java"),
        activitySource(packageName, privacyUrl),
      );
      return config;
    },
  ]);
};

function activitySource(packageName, privacyUrl) {
  return `package ${packageName};

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class HealthPrivacyActivity extends Activity {
  private WebView web;
  private final String policyUrl = ${JSON.stringify(privacyUrl)};
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    LinearLayout layout = new LinearLayout(this);
    layout.setOrientation(LinearLayout.VERTICAL);
    Button close = new Button(this);
    close.setText("Back to Health Connect");
    close.setOnClickListener(v -> finish());
    layout.addView(close);
    TextView status = new TextView(this);
    status.setPadding(24, 12, 24, 12);
    status.setTextSize(16);
    status.setText("FitSync Privacy Policy. Health imports are optional: steps, sleep and weight are read to sync your progress journal. Contact sahillsahudev@gmail.com for privacy help.");
    layout.addView(status);
    Button retry = new Button(this);
    retry.setText("Reload privacy policy");
    layout.addView(retry);
    web = new WebView(this);
    web.getSettings().setJavaScriptEnabled(false);
    web.getSettings().setAllowFileAccess(false);
    web.getSettings().setAllowContentAccess(false);
    web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri target = request.getUrl();
        Uri policy = Uri.parse(policyUrl);
        if ("https".equals(target.getScheme()) && policy.getHost() != null && policy.getHost().equals(target.getHost())) return false;
        if ("https".equals(target.getScheme()) || "mailto".equals(target.getScheme())) {
          try { startActivity(new Intent(Intent.ACTION_VIEW, target)); } catch (Exception ignored) { }
        }
        return true;
      }
      @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (request.isForMainFrame()) status.setText("The full FitSync Privacy Policy could not load. Check your connection and reload, or open " + policyUrl + ". Privacy contact: sahillsahudev@gmail.com");
      }
    });
    layout.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
    setContentView(layout);
    retry.setOnClickListener(v -> { if (!policyUrl.isEmpty()) web.loadUrl(policyUrl); });
    if (!policyUrl.isEmpty()) web.loadUrl(policyUrl);
  }
  @Override public void onDestroy() {
    if (web != null) { web.stopLoading(); web.destroy(); }
    super.onDestroy();
  }
}
`;
}
