package com.gogogadget.scanner

import android.bluetooth.le.ScanResult
import android.os.ParcelUuid

enum class ThreatLevel { INFO, CAUTION, ALERT }

data class Classification(
    val brand: String,
    val kind: String,
    val threat: ThreatLevel,
    val detail: String
)

/**
 * Fingerprints BLE advertisements against known tracker signatures:
 * manufacturer-specific data company IDs and 16-bit service UUIDs.
 */
object TrackerClassifier {

    private val UUID_TILE = ParcelUuid.fromString("0000feed-0000-1000-8000-00805f9b34fb")
    private val UUID_TILE_ACT = ParcelUuid.fromString("0000feec-0000-1000-8000-00805f9b34fb")
    private val UUID_CHIPOLO = ParcelUuid.fromString("0000fe33-0000-1000-8000-00805f9b34fb")
    private val UUID_EDDYSTONE = ParcelUuid.fromString("0000feaa-0000-1000-8000-00805f9b34fb")
    private val UUID_FASTPAIR = ParcelUuid.fromString("0000fe2c-0000-1000-8000-00805f9b34fb")
    val UUID_REMOTE_ID: ParcelUuid = ParcelUuid.fromString("0000fffa-0000-1000-8000-00805f9b34fb")

    private const val COMPANY_APPLE = 0x004C
    private const val COMPANY_SAMSUNG = 0x0075
    private const val COMPANY_PEBBLEBEE = 0x0157 // also used by some fitness devices
    private const val APPLE_TYPE_FINDMY = 0x12
    private const val APPLE_TYPE_NEARBY = 0x10
    private const val APPLE_TYPE_AIRPRINT = 0x07

    fun classify(result: ScanResult): Classification {
        val record = result.scanRecord ?: return unknown()
        val uuids = record.serviceUuids ?: emptyList()
        val serviceData = record.serviceData ?: emptyMap()

        // Drone Remote ID (ASTM F3411 over BLE legacy advertising)
        serviceData[UUID_REMOTE_ID]?.let { data ->
            if (data.isNotEmpty() && (data[0].toInt() and 0xFF) == 0x0D) {
                return Classification("Drone", "FAA Remote ID broadcast", ThreatLevel.CAUTION,
                    "ASTM F3411 Remote ID frame detected")
            }
        }

        // Apple Find My network (AirTag / offline-finding accessories)
        record.getManufacturerSpecificData(COMPANY_APPLE)?.let { data ->
            if (data.isNotEmpty()) {
                when (data[0].toInt() and 0xFF) {
                    APPLE_TYPE_FINDMY -> {
                        // Status byte bit 0x04 set = separated from owner for a while
                        val separated = data.size > 2 && (data[2].toInt() and 0x04) != 0
                        return Classification(
                            "Apple", "Find My tracker (AirTag class)",
                            if (separated) ThreatLevel.ALERT else ThreatLevel.CAUTION,
                            if (separated) "Broadcasting in SEPARATED state — away from its owner"
                            else "Find My offline-finding advertisement")
                    }
                    APPLE_TYPE_NEARBY -> return Classification("Apple", "Apple device (nearby)",
                        ThreatLevel.INFO, "Apple continuity advertisement")
                    APPLE_TYPE_AIRPRINT -> return Classification("Apple", "AirPods / accessory",
                        ThreatLevel.INFO, "Apple accessory advertisement")
                    else -> return Classification("Apple", "Apple BLE device",
                        ThreatLevel.INFO, "Apple manufacturer frame")
                }
            }
        }

        // Samsung SmartTag
        record.getManufacturerSpecificData(COMPANY_SAMSUNG)?.let {
            return Classification("Samsung", "Galaxy SmartTag", ThreatLevel.CAUTION,
                "Samsung offline-finding advertisement")
        }

        record.getManufacturerSpecificData(COMPANY_PEBBLEBEE)?.let {
            return Classification("PebbleBee", "PebbleBee tracker", ThreatLevel.CAUTION,
                "PebbleBee manufacturer frame")
        }

        if (uuids.contains(UUID_TILE) || uuids.contains(UUID_TILE_ACT) ||
            serviceData.containsKey(UUID_TILE) || serviceData.containsKey(UUID_TILE_ACT)) {
            return Classification("Tile", "Tile tracker", ThreatLevel.CAUTION,
                "Tile service advertisement")
        }

        if (uuids.contains(UUID_CHIPOLO) || serviceData.containsKey(UUID_CHIPOLO)) {
            return Classification("Chipolo", "Chipolo tracker", ThreatLevel.CAUTION,
                "Chipolo service advertisement")
        }

        // Google Find My Device network tags advertise Eddystone-style frames (0xFEAA, frame 0x40)
        serviceData[UUID_EDDYSTONE]?.let { data ->
            if (data.isNotEmpty() && (data[0].toInt() and 0xFF) == 0x40) {
                return Classification("Google", "Find My Device tag", ThreatLevel.CAUTION,
                    "Find My Device network advertisement")
            }
            return Classification("Beacon", "Eddystone beacon", ThreatLevel.INFO,
                "Eddystone beacon frame")
        }

        if (uuids.contains(UUID_FASTPAIR) || serviceData.containsKey(UUID_FASTPAIR)) {
            return Classification("Google", "Fast Pair device", ThreatLevel.INFO,
                "Google Fast Pair advertisement")
        }

        val name = record.deviceName
        if (!name.isNullOrBlank()) {
            val lower = name.lowercase()
            if (listOf("tag", "tracker", "tile", "chipolo", "smarttag", "itag").any { lower.contains(it) }) {
                return Classification("Generic", "Possible tracker \"$name\"", ThreatLevel.CAUTION,
                    "Device name suggests a tracking tag")
            }
            return Classification("BLE", name, ThreatLevel.INFO, "Named BLE device")
        }
        return unknown()
    }

    private fun unknown() = Classification("BLE", "Unknown BLE device", ThreatLevel.INFO,
        "Unclassified advertisement")
}
