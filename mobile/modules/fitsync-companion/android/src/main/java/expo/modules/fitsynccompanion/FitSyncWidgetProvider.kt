package expo.modules.fitsynccompanion

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.AtomicFile
import android.widget.RemoteViews
import java.io.File
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import java.time.DayOfWeek

class FitSyncWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { manager.updateAppWidget(it, render(context)) }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == Intent.ACTION_DATE_CHANGED || intent.action == Intent.ACTION_TIMEZONE_CHANGED) refresh(context)
  }

  companion object {
    private val snapshotLock = Any()

    // Health-derived widget snapshots must not migrate through Android backup
    // independently of the signed-in FitSync account.
    private fun snapshotFile(context: Context) = AtomicFile(File(context.noBackupFilesDir, "fitsync-companion-widget.json"))
    fun writeSnapshot(context: Context, snapshot: String?) = synchronized(snapshotLock) {
      val file = snapshotFile(context)
      if (snapshot == null) { file.delete(); return@synchronized }
      val stream = file.startWrite()
      try {
        stream.write(snapshot.toByteArray(Charsets.UTF_8))
        file.finishWrite(stream)
      } catch (error: Exception) { file.failWrite(stream); throw error }
    }

    fun refresh(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, FitSyncWidgetProvider::class.java))
      if (ids.isNotEmpty()) manager.updateAppWidget(ids, render(context))
    }

    private fun open(context: Context, request: Int, path: String): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("fitsync://$path"))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      return PendingIntent.getActivity(context, request, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun render(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.fitsync_companion_widget)
      val raw = synchronized(snapshotLock) { runCatching { String(snapshotFile(context).readFully(), Charsets.UTF_8) }.getOrNull() }
      val data = runCatching { raw?.let { JSONObject(it) } }.getOrNull()
      val updated = runCatching { Instant.parse(data?.optString("updatedAt")) }.getOrNull()
      val now = Instant.now()
      val fresh = data != null && !data.optString("ownerId").isBlank() && updated != null &&
        updated.isAfter(now.minusSeconds(86_400)) && !updated.isAfter(now.plusSeconds(300))
      var title = "Your training, one tap away"
      var detail = "Open FitSync to sync your plan"
      var button = "Open FitSync"
      var path = "train"
      var progress = "View progress →"
      if (fresh && data != null && updated != null) {
        val zone = runCatching { ZoneId.of(data.optString("timezone")) }.getOrDefault(ZoneId.systemDefault())
        val today = LocalDate.now(zone)
        val sessionDate = runCatching { LocalDate.parse(data.optString("nextSessionDate")) }.getOrNull()
        val nextTitle = data.optString("nextSessionTitle").takeIf { it.isNotBlank() && it != "null" }
        val activeId = data.optString("activeSessionId").takeIf { it.isNotBlank() && it != "null" }
        val syncedDate = updated.atZone(zone).toLocalDate()
        val thisWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val syncedWeek = syncedDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        if (thisWeek == syncedWeek) {
          val complete = data.optInt("weeklyCompleted").coerceAtLeast(0)
          val target = data.optInt("weeklyTarget").coerceAtLeast(0)
          progress = if (target > 0) "$complete / $target this week →" else "$complete workouts this week →"
        }
        if (activeId != null) {
          title = "Your workout is in progress"
          detail = "Resume your session · synced $syncedDate"
          button = "Resume workout"
          path = "workout"
        } else if (nextTitle != null && sessionDate != null && !sessionDate.isBefore(today)) {
          title = nextTitle
          detail = "${if (sessionDate == today) "Today" else "Next · $sessionDate"} · synced $syncedDate"
          button = "View session"
          path = "companion"
        } else {
          title = "Recovery is part of progress"
          detail = "No upcoming session in your synced plan · $syncedDate"
          button = "Open training"
        }
      }
      views.setTextViewText(R.id.fitsync_widget_title, title)
      views.setTextViewText(R.id.fitsync_widget_detail, detail)
      views.setTextViewText(R.id.fitsync_widget_start, button)
      views.setTextViewText(R.id.fitsync_widget_progress, progress)
      views.setOnClickPendingIntent(R.id.fitsync_widget_root, open(context, 6100, "companion"))
      views.setOnClickPendingIntent(R.id.fitsync_widget_start, open(context, 6101, path))
      views.setOnClickPendingIntent(R.id.fitsync_widget_progress, open(context, 6102, "progress"))
      return views
    }
  }
}
