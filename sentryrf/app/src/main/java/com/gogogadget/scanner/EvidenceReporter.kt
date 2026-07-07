package com.gogogadget.scanner

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Builds a tamper-evident evidence report: all recorded sightings plus a
 * SHA-256 digest of the payload so any later edit is detectable.
 */
object EvidenceReporter {

    fun buildAndShare(context: Context) {
        val store = BleEngine.sightings(context)
        val fmt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss z", Locale.US)

        val sightings = JSONArray()
        store.all().forEach { s ->
            sightings.put(JSONObject().apply {
                put("device_id", s.deviceId)
                put("brand", s.brand)
                put("kind", s.kind)
                put("first_seen", fmt.format(Date(s.firstSeen)))
                put("last_seen", fmt.format(Date(s.lastSeen)))
                put("observation_count", s.count)
                put("duration_minutes", s.durationMinutes())
                put("location_span_meters", s.locationSpanMeters().toInt())
                put("strongest_rssi_dbm", s.maxRssi)
                put("following_indicator", s.isFollowing())
            })
        }

        val payload = JSONObject().apply {
            put("report_type", "Go Go Gadget Scanner counter-surveillance evidence report")
            put("generated_at", fmt.format(Date()))
            put("generator", "Go Go Gadget Scanner v1.0 (on-device, no cloud)")
            put("sighting_count", sightings.length())
            put("sightings", sightings)
        }
        val body = payload.toString(2)
        val digest = MessageDigest.getInstance("SHA-256").digest(body.toByteArray())
            .joinToString("") { "%02x".format(it) }

        val full = JSONObject().apply {
            put("report", payload)
            put("integrity", JSONObject().apply {
                put("algorithm", "SHA-256")
                put("report_digest", digest)
                put("note", "Recompute SHA-256 over the canonical 'report' JSON to verify integrity")
            })
        }

        val dir = File(context.cacheDir, "reports").apply { mkdirs() }
        val file = File(dir, "sentryrf-evidence-${System.currentTimeMillis()}.json")
        file.writeText(full.toString(2))

        val uri = FileProvider.getUriForFile(context, "com.gogogadget.scanner.fileprovider", file)
        val share = Intent(Intent.ACTION_SEND).apply {
            type = "application/json"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, "Sentry RF evidence report")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(share, "Share evidence report"))
    }
}
