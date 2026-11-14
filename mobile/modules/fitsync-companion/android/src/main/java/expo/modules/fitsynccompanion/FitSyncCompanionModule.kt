package expo.modules.fitsynccompanion

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues
import org.json.JSONObject

class FitSyncCompanionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FitSyncCompanion")

    AsyncFunction("publish") { snapshot: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("FitSync is not available")
      val value = JSONObject(snapshot)
      require(value.optString("ownerId").isNotBlank()) { "A signed-in account is required" }
      require(value.optString("updatedAt").isNotBlank()) { "A sync timestamp is required" }
      require(snapshot.length <= 8192) { "Widget snapshot is too large" }
      // A single owner-scoped snapshot replaces the previous account in one
      // commit. No workout history or authentication tokens enter the widget.
      FitSyncWidgetProvider.writeSnapshot(context, snapshot)
      FitSyncWidgetProvider.refresh(context)
    }

    AsyncFunction("clear") {
      val context = appContext.reactContext ?: return@AsyncFunction
      FitSyncWidgetProvider.writeSnapshot(context, null)
      FitSyncWidgetProvider.refresh(context)
    }

    AsyncFunction("requestPin") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      val manager = AppWidgetManager.getInstance(context)
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !manager.isRequestPinAppWidgetSupported) return@AsyncFunction false
      manager.requestPinAppWidget(ComponentName(context, FitSyncWidgetProvider::class.java), null, null)
    }.runOnQueue(Queues.MAIN)
  }
}
