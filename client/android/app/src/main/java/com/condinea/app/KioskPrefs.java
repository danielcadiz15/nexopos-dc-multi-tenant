package com.condinea.app;

import android.content.Context;
import android.content.SharedPreferences;

public final class KioskPrefs {
    private static final String PREFS_NAME = "nexopos_kiosk_prefs";
    private static final String KEY_KIOSK_ENABLED = "kiosk_enabled";
    private static final String KEY_WATCHDOG_ENABLED = "watchdog_enabled";
    private static final String KEY_ADMIN_PIN = "admin_pin";
    private static final String KEY_RESTART_MINUTES = "restart_minutes";

    private KioskPrefs() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static boolean isKioskEnabled(Context context) {
        // Modo seguro: kiosko desactivado por defecto hasta activación manual.
        return prefs(context).getBoolean(KEY_KIOSK_ENABLED, false);
    }

    public static void setKioskEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean(KEY_KIOSK_ENABLED, enabled).apply();
    }

    public static boolean isWatchdogEnabled(Context context) {
        // Se habilita manualmente desde el panel técnico cuando el equipo está listo.
        return prefs(context).getBoolean(KEY_WATCHDOG_ENABLED, false);
    }

    public static void setWatchdogEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean(KEY_WATCHDOG_ENABLED, enabled).apply();
    }

    public static String getAdminPin(Context context) {
        return prefs(context).getString(KEY_ADMIN_PIN, "2580");
    }

    public static void setAdminPin(Context context, String pin) {
        prefs(context).edit().putString(KEY_ADMIN_PIN, pin).apply();
    }

    public static int getRestartMinutes(Context context) {
        return prefs(context).getInt(KEY_RESTART_MINUTES, 0);
    }

    public static void setRestartMinutes(Context context, int minutes) {
        prefs(context).edit().putInt(KEY_RESTART_MINUTES, Math.max(0, minutes)).apply();
    }
}
