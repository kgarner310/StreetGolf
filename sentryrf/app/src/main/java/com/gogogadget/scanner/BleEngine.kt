package com.gogogadget.scanner

import android.annotation.SuppressLint
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.location.Location
import android.location.LocationManager

data class DetectedDevice(
    val address: String,
    var classification: Classification,
    var rssi: Int,
    var smoothedRssi: Double,
    var txPower: Int?,
    var firstSeen: Long,
    var lastSeen: Long,
    var hits: Int
) {
    /** Log-distance path loss estimate. Rough, but good enough for hot/cold sweeps. */
    fun estimatedMeters(): Double {
        val tx = txPower ?: -59
        return Math.pow(10.0, (tx - smoothedRssi) / (10.0 * 2.2))
    }
}

/**
 * Central BLE scanning engine. Fragments register listeners; the engine
 * classifies every advertisement, tracks per-device state, decodes drone
 * Remote ID frames, and records sightings for following detection.
 */
@SuppressLint("MissingPermission")
object BleEngine {

    interface Listener {
        fun onDevicesUpdated(devices: List<DetectedDevice>)
        fun onDroneUpdated(drones: List<DroneInfo>) {}
    }

    val devices = LinkedHashMap<String, DetectedDevice>()
    val drones = LinkedHashMap<String, DroneInfo>()
    var scanning = false
        private set

    private val listeners = mutableListOf<Listener>()
    private var store: SightingStore? = null
    private var appContext: Context? = null

    fun addListener(l: Listener) { if (!listeners.contains(l)) listeners.add(l) }
    fun removeListener(l: Listener) { listeners.remove(l) }

    private val callback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            handle(result)
        }
        override fun onBatchScanResults(results: List<ScanResult>) {
            results.forEach { handle(it) }
        }
    }

    private fun handle(result: ScanResult) {
        val addr = result.device.address ?: return
        val cls = TrackerClassifier.classify(result)
        val now = System.currentTimeMillis()

        val dev = devices.getOrPut(addr) {
            DetectedDevice(addr, cls, result.rssi, result.rssi.toDouble(),
                result.scanRecord?.txPowerLevel?.takeIf { it != Int.MIN_VALUE },
                now, now, 0)
        }
        dev.classification = cls
        dev.rssi = result.rssi
        dev.smoothedRssi = dev.smoothedRssi * 0.7 + result.rssi * 0.3
        dev.lastSeen = now
        dev.hits++

        // Drone Remote ID decode
        result.scanRecord?.serviceData?.get(TrackerClassifier.UUID_REMOTE_ID)?.let { data ->
            RemoteIdParser.parse(addr, data, result.rssi)?.let { info ->
                drones[addr] = info
                listeners.forEach { it.onDroneUpdated(drones.values.toList()) }
            }
        }

        // Persist tracker-class sightings for following detection
        if (cls.threat != ThreatLevel.INFO) {
            val loc = lastKnownLocation()
            store?.record(addr, cls.brand, cls.kind, result.rssi,
                loc?.latitude, loc?.longitude)
        }

        listeners.forEach { it.onDevicesUpdated(devices.values.toList()) }
    }

    private fun lastKnownLocation(): Location? {
        val ctx = appContext ?: return null
        return try {
            val lm = ctx.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            lm.getProviders(true).mapNotNull { lm.getLastKnownLocation(it) }
                .maxByOrNull { it.time }
        } catch (e: SecurityException) {
            null
        }
    }

    fun start(context: Context): Boolean {
        if (scanning) return true
        appContext = context.applicationContext
        store = store ?: SightingStore(context.applicationContext)
        val bt = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val scanner = bt.adapter?.bluetoothLeScanner ?: return false
        return try {
            val settings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build()
            scanner.startScan(null, settings, callback)
            scanning = true
            true
        } catch (e: Exception) {
            false
        }
    }

    fun stop(context: Context) {
        if (!scanning) return
        val bt = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        try {
            bt.adapter?.bluetoothLeScanner?.stopScan(callback)
        } catch (_: Exception) {}
        scanning = false
    }

    fun sightings(context: Context): SightingStore {
        if (store == null) store = SightingStore(context.applicationContext)
        return store!!
    }

    fun threatCounts(): Triple<Int, Int, Int> {
        var alert = 0; var caution = 0; var info = 0
        devices.values.forEach {
            when (it.classification.threat) {
                ThreatLevel.ALERT -> alert++
                ThreatLevel.CAUTION -> caution++
                ThreatLevel.INFO -> info++
            }
        }
        return Triple(alert, caution, info)
    }
}
