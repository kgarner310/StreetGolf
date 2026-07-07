package com.gogogadget.scanner

import android.annotation.SuppressLint
import android.content.Context
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager

data class WifiFinding(
    val ssid: String,
    val bssid: String,
    val security: String,
    val rssi: Int,
    val channel: Int,
    val threat: ThreatLevel,
    val notes: List<String>
)

/**
 * Analyzes WiFi scan results for rogue-network patterns: evil twins
 * (same SSID, mixed security), open impostor networks, and hidden APs.
 */
object WifiAnalyzer {

    private val IMPERSONATION_TARGETS = listOf(
        "free", "guest", "public", "airport", "hotel", "starbucks", "mcdonald",
        "xfinity", "attwifi", "boingo"
    )

    @SuppressLint("MissingPermission")
    fun scan(context: Context): List<WifiFinding> {
        val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        @Suppress("DEPRECATION")
        wm.startScan()
        @Suppress("DEPRECATION")
        val results: List<ScanResult> = try { wm.scanResults } catch (e: SecurityException) { emptyList() }
        return analyze(results)
    }

    fun analyze(results: List<ScanResult>): List<WifiFinding> {
        @Suppress("DEPRECATION")
        val bySsid = results.filter { !it.SSID.isNullOrBlank() }.groupBy { it.SSID }

        return results.map { r ->
            @Suppress("DEPRECATION")
            val ssid = r.SSID ?: ""
            val sec = securityOf(r.capabilities ?: "")
            val notes = mutableListOf<String>()
            var threat = ThreatLevel.INFO

            if (ssid.isBlank()) {
                notes.add("Hidden network (no SSID broadcast)")
                threat = ThreatLevel.CAUTION
            } else {
                val siblings = bySsid[ssid] ?: emptyList()
                val secs = siblings.map { securityOf(it.capabilities ?: "") }.toSet()
                if (siblings.size > 1 && secs.size > 1) {
                    notes.add("EVIL TWIN pattern: ${siblings.size} APs share this name with different security ($secs)")
                    threat = ThreatLevel.ALERT
                }
                if (sec == "OPEN") {
                    if (IMPERSONATION_TARGETS.any { ssid.lowercase().contains(it) }) {
                        notes.add("Open network with a public-hotspot style name — classic captive-portal trap")
                        threat = maxOf(threat, ThreatLevel.CAUTION, compareBy { it.ordinal })
                    } else {
                        notes.add("Unencrypted network — traffic can be observed")
                        if (threat == ThreatLevel.INFO) threat = ThreatLevel.CAUTION
                    }
                }
                if (sec == "WEP") {
                    notes.add("WEP encryption is broken; possible downgrade lure")
                    threat = maxOf(threat, ThreatLevel.CAUTION, compareBy { it.ordinal })
                }
            }
            if (notes.isEmpty()) notes.add("No anomalies for this AP")

            WifiFinding(ssid.ifBlank { "(hidden)" }, r.BSSID ?: "?", sec, r.level,
                channelFromFreq(r.frequency), threat, notes)
        }.sortedByDescending { it.threat.ordinal * 1000 + it.rssi }
    }

    private fun securityOf(caps: String): String = when {
        caps.contains("WEP") -> "WEP"
        caps.contains("WPA3") || caps.contains("SAE") -> "WPA3"
        caps.contains("WPA2") || caps.contains("RSN") -> "WPA2"
        caps.contains("WPA") -> "WPA"
        else -> "OPEN"
    }

    private fun channelFromFreq(freq: Int): Int = when {
        freq in 2412..2484 -> (freq - 2407) / 5
        freq in 5170..5825 -> (freq - 5000) / 5
        freq > 5925 -> (freq - 5950) / 5
        else -> 0
    }
}
