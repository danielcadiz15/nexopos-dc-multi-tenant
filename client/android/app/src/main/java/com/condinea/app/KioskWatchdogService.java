package com.condinea.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

public class KioskWatchdogService extends Service {
    private static final String CHANNEL_ID = "nexopos_kiosk_watchdog";
    private static final int NOTIF_ID = 9211;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannelIfNeeded();
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("NexoPOS Kiosk")
            .setContentText("Modo kiosko activo")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build();
        startForeground(NOTIF_ID, notification);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        scheduleReopen(1200);
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        if (KioskPrefs.isWatchdogEnabled(this) && KioskPrefs.isKioskEnabled(this)) {
            scheduleReopen(1200);
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void scheduleReopen(long delayMs) {
        Intent i = new Intent(getApplicationContext(), MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            getApplicationContext(),
            48001,
            i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            long triggerAt = System.currentTimeMillis() + Math.max(300, delayMs);
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        }
    }

    private void createChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "NexoPOS Kiosk",
            NotificationManager.IMPORTANCE_MIN
        );
        channel.setDescription("Servicio watchdog de modo kiosko");
        nm.createNotificationChannel(channel);
    }
}
