package com.condinea.app;

import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.text.InputType;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends BridgeActivity {
    private static final String ADMIN_WEB_URL = "https://nexopos-dc.web.app/login";
    private static final long TEMP_UNLOCK_MS = 5L * 60L * 1000L;
    private static final Set<String> ALLOWED_HOSTS = new HashSet<>(Arrays.asList(
        "nexopos-dc.web.app",
        "www.nexopos-dc.web.app"
    ));

    private final Handler handler = new Handler(Looper.getMainLooper());
    private int hiddenTapCount = 0;
    private long hiddenTapFirstMs = 0L;
    private boolean technicalUnlocked = false;
    private long allowExitUntilMs = 0L;
    private boolean jsBridgeAttached = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        attachJsBridgeIfNeeded();
        applyImmersiveMode();
        applyKioskPoliciesIfEnabled();
        enforceAllowedDomain();
    }

    @Override
    public void onResume() {
        super.onResume();
        attachJsBridgeIfNeeded();
        applyImmersiveMode();
        handler.postDelayed(this::applyImmersiveMode, 220);
        if (KioskPrefs.isKioskEnabled(this)) {
            applyKioskPoliciesIfEnabled();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
    }

    @Override
    public void onStop() {
        super.onStop();
    }

    @Override
    public void onBackPressed() {
        if (KioskPrefs.isKioskEnabled(this) && !technicalUnlocked && !isTemporaryExitAllowed()) {
            Toast.makeText(this, "Modo kiosko activo", Toast.LENGTH_SHORT).show();
            return;
        }
        super.onBackPressed();
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (KioskPrefs.isKioskEnabled(this) && !technicalUnlocked && !isTemporaryExitAllowed()) {
            scheduleBringToFront();
        }
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        detectHiddenTechnicalGesture(ev);
        return super.dispatchTouchEvent(ev);
    }

    private void detectHiddenTechnicalGesture(MotionEvent ev) {
        if (ev.getAction() != MotionEvent.ACTION_UP) return;
        if (ev.getX() > 140 || ev.getY() > 140) return;

        long now = System.currentTimeMillis();
        if (hiddenTapFirstMs == 0 || (now - hiddenTapFirstMs) > 2200) {
            hiddenTapFirstMs = now;
            hiddenTapCount = 1;
            return;
        }
        hiddenTapCount += 1;
        if (hiddenTapCount >= 6) {
            hiddenTapCount = 0;
            hiddenTapFirstMs = 0;
            showAdminPinDialog();
        }
    }

    private void showAdminPinDialog() {
        EditText pinInput = new EditText(this);
        pinInput.setHint("PIN administrador");
        pinInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);

        new AlertDialog.Builder(this)
            .setTitle("Modo técnico")
            .setMessage("Ingresá el PIN para abrir el panel técnico.")
            .setView(pinInput)
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Ingresar", (dialog, which) -> {
                String entered = String.valueOf(pinInput.getText());
                if (!KioskPrefs.getAdminPin(this).equals(entered)) {
                    Toast.makeText(this, "PIN incorrecto", Toast.LENGTH_SHORT).show();
                    return;
                }
                technicalUnlocked = true;
                showTechnicalPanel();
            })
            .show();
    }

    private void showTechnicalPanel() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int p = (int) (16 * getResources().getDisplayMetrics().density);
        root.setPadding(p, p, p, p);

        Switch kioskSwitch = new Switch(this);
        kioskSwitch.setText("Modo kiosko");
        kioskSwitch.setChecked(KioskPrefs.isKioskEnabled(this));
        root.addView(kioskSwitch);

        Switch watchdogSwitch = new Switch(this);
        watchdogSwitch.setText("Watchdog");
        watchdogSwitch.setChecked(KioskPrefs.isWatchdogEnabled(this));
        root.addView(watchdogSwitch);

        EditText restartInput = new EditText(this);
        restartInput.setHint("Reinicio app (min, 0=off)");
        restartInput.setInputType(InputType.TYPE_CLASS_NUMBER);
        restartInput.setText(String.valueOf(KioskPrefs.getRestartMinutes(this)));
        root.addView(restartInput);

        EditText pinInput = new EditText(this);
        pinInput.setHint("Nuevo PIN (4+ dígitos)");
        pinInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        root.addView(pinInput);

        new AlertDialog.Builder(this)
            .setTitle("Panel técnico NexoPOS")
            .setMessage(
                "Gesto oculto: 6 toques en la esquina superior izquierda.\n" +
                "Para bloqueo total (status bar/multitarea/apps), configurar la app como Device Owner."
            )
            .setView(root)
            .setNegativeButton("Cerrar", (d, w) -> lockAgain())
            .setNeutralButton("Salir kiosko", (d, w) -> {
                KioskPrefs.setKioskEnabled(this, false);
                technicalUnlocked = false;
                Toast.makeText(this, "Modo kiosko desactivado", Toast.LENGTH_LONG).show();
            })
            .setPositiveButton("Guardar", (d, w) -> {
                KioskPrefs.setKioskEnabled(this, kioskSwitch.isChecked());
                KioskPrefs.setWatchdogEnabled(this, watchdogSwitch.isChecked());
                int restartMin = parsePositiveInt(restartInput.getText() == null ? "0" : restartInput.getText().toString());
                KioskPrefs.setRestartMinutes(this, restartMin);
                String pin = pinInput.getText() == null ? "" : pinInput.getText().toString().trim();
                if (pin.length() >= 4) {
                    KioskPrefs.setAdminPin(this, pin);
                }
                if (kioskSwitch.isChecked()) {
                    applyKioskPoliciesIfEnabled();
                }
                lockAgain();
            })
            .show();
    }

    private void lockAgain() {
        technicalUnlocked = false;
        if (KioskPrefs.isKioskEnabled(this)) {
            applyKioskPoliciesIfEnabled();
            applyImmersiveMode();
        }
    }

    private void applyKioskPoliciesIfEnabled() {
        if (!KioskPrefs.isKioskEnabled(this)) return;
        applyImmersiveMode();
        startWatchdogService();
    }

    private void applyImmersiveMode() {
        View decorView = getWindow().getDecorView();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = decorView.getWindowInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            int flags = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN;
            decorView.setSystemUiVisibility(flags);
        }
    }

    private void scheduleBringToFront() {
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(() -> {
            if (!KioskPrefs.isKioskEnabled(this) || technicalUnlocked || isTemporaryExitAllowed()) return;
            if (isDeviceLockedOrScreenOff()) return;
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            startActivity(i);
        }, 500);
    }

    private void startWatchdogService() {
        Intent serviceIntent = new Intent(this, KioskWatchdogService.class);
        try {
            ContextCompat.startForegroundService(this, serviceIntent);
        } catch (Exception ignored) {
            startService(serviceIntent);
        }
    }

    private boolean isDeviceLockedOrScreenOff() {
        try {
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            boolean locked = km != null && km.isKeyguardLocked();
            boolean screenInteractive = pm != null && pm.isInteractive();
            return locked || !screenInteractive;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void enforceAllowedDomain() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        String current = getBridge().getWebView().getUrl();
        if (current == null || current.isEmpty()) return;
        for (String host : ALLOWED_HOSTS) {
            if (current.contains(host)) return;
        }
        getBridge().getWebView().loadUrl("https://nexopos-dc.web.app/cajero");
    }

    private int parsePositiveInt(String raw) {
        try {
            int n = Integer.parseInt(raw.trim());
            return Math.max(0, n);
        } catch (Exception e) {
            return 0;
        }
    }

    private boolean isTemporaryExitAllowed() {
        return System.currentTimeMillis() < allowExitUntilMs;
    }

    private void requestPinThen(Runnable onSuccess) {
        EditText pinInput = new EditText(this);
        pinInput.setHint("PIN de administrador");
        pinInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        new AlertDialog.Builder(this)
            .setTitle("Desbloqueo temporal")
            .setMessage("Ingresá el PIN para continuar.")
            .setView(pinInput)
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Desbloquear", (d, w) -> {
                String entered = String.valueOf(pinInput.getText());
                if (!KioskPrefs.getAdminPin(this).equals(entered)) {
                    Toast.makeText(this, "PIN incorrecto", Toast.LENGTH_SHORT).show();
                    return;
                }
                allowExitUntilMs = System.currentTimeMillis() + TEMP_UNLOCK_MS;
                if (onSuccess != null) onSuccess.run();
            })
            .show();
    }

    private void openAdminInChrome() {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(ADMIN_WEB_URL));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        i.setPackage("com.android.chrome");
        try {
            startActivity(i);
        } catch (ActivityNotFoundException noChrome) {
            i.setPackage(null);
            startActivity(i);
        }
    }

    private void openExternalUrlInChrome(String rawUrl) {
        if (rawUrl == null) return;
        String url = rawUrl.trim();
        if (!(url.startsWith("https://") || url.startsWith("http://"))) return;
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        i.setPackage("com.android.chrome");
        try {
            startActivity(i);
        } catch (ActivityNotFoundException noChrome) {
            i.setPackage(null);
            startActivity(i);
        }
    }

    private void attachJsBridgeIfNeeded() {
        if (jsBridgeAttached || getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().addJavascriptInterface(new NexoAndroidBridge(), "NexoAndroid");
        jsBridgeAttached = true;
    }

    public class NexoAndroidBridge {
        @JavascriptInterface
        public void openAdminInChrome() {
            runOnUiThread(() -> requestPinThen(MainActivity.this::openAdminInChrome));
        }

        @JavascriptInterface
        public void openExternalUrlInChrome(String url) {
            runOnUiThread(() -> openExternalUrlInChrome(url));
        }
    }
}
