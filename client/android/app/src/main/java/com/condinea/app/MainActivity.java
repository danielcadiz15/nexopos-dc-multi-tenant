package com.condinea.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;

import com.getcapacitor.BridgeActivity;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends BridgeActivity {
    private static final Set<String> ALLOWED_HOSTS = new HashSet<>(Arrays.asList(
        "nexopos-dc.web.app",
        "www.nexopos-dc.web.app"
    ));
    private static final String[] KIOSK_BLOCKLIST_PACKAGES = new String[] {
        "com.android.chrome",
        "com.android.vending",
        "com.google.android.youtube",
        "com.google.android.gm",
        "com.android.calendar",
        "com.google.android.apps.maps"
    };

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable immersiveRunnable = this::applyImmersiveMode;
    private int hiddenTapCount = 0;
    private long hiddenTapFirstMs = 0L;
    private boolean technicalUnlocked = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyImmersiveMode();
        startWatchdogIfEnabled();
        applyKioskPoliciesIfEnabled();
        scheduleRelaunchIfConfigured();
        enforceAllowedDomain();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (KioskPrefs.isKioskEnabled(this)) {
            applyImmersiveMode();
            applyKioskPoliciesIfEnabled();
            scheduleBringToFront();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (KioskPrefs.isKioskEnabled(this) && !technicalUnlocked) {
            scheduleBringToFront();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (KioskPrefs.isKioskEnabled(this) && !technicalUnlocked) {
            scheduleBringToFront();
        }
    }

    @Override
    public void onBackPressed() {
        if (KioskPrefs.isKioskEnabled(this) && !technicalUnlocked) {
            Toast.makeText(this, "Modo kiosko activo", Toast.LENGTH_SHORT).show();
            return;
        }
        super.onBackPressed();
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (KioskPrefs.isKioskEnabled(this) && !technicalUnlocked) {
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
                stopWatchdog();
                stopLockTaskSafely();
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
                    startWatchdogIfEnabled();
                    scheduleRelaunchIfConfigured();
                } else {
                    stopWatchdog();
                    stopLockTaskSafely();
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
        configureDeviceOwnerPolicies();
        startLockTaskSafely();
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
        handler.removeCallbacks(immersiveRunnable);
        handler.postDelayed(immersiveRunnable, 800);
    }

    private void startLockTaskSafely() {
        try {
            startLockTask();
        } catch (Exception ignored) {
            // Si no es Device Owner, dependerá de screen pinning/manual.
        }
    }

    private void stopLockTaskSafely() {
        try {
            stopLockTask();
        } catch (Exception ignored) {
        }
    }

    private void configureDeviceOwnerPolicies() {
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        ComponentName admin = new ComponentName(this, KioskAdminReceiver.class);
        if (dpm == null || !dpm.isDeviceOwnerApp(getPackageName())) return;

        try {
            dpm.setLockTaskPackages(admin, new String[]{getPackageName()});
        } catch (Exception ignored) {}

        // Ocultar apps no permitidas (solo si somos Device Owner).
        for (String pkg : KIOSK_BLOCKLIST_PACKAGES) {
            try {
                dpm.setApplicationHidden(admin, pkg, true);
            } catch (Exception ignored) {}
        }
    }

    private void startWatchdogIfEnabled() {
        if (!KioskPrefs.isWatchdogEnabled(this)) return;
        Intent i = new Intent(this, KioskWatchdogService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(i);
        } else {
            startService(i);
        }
    }

    private void stopWatchdog() {
        stopService(new Intent(this, KioskWatchdogService.class));
    }

    private void scheduleBringToFront() {
        handler.postDelayed(() -> {
            if (!KioskPrefs.isKioskEnabled(this) || technicalUnlocked) return;
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            startActivity(i);
        }, 500);
    }

    private void scheduleRelaunchIfConfigured() {
        int minutes = KioskPrefs.getRestartMinutes(this);
        if (minutes <= 0) return;
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this,
            48002,
            i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        long triggerAt = System.currentTimeMillis() + minutes * 60L * 1000L;
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
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
}
