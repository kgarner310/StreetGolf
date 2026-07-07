package com.gogogadget.scanner

/**
 * Minimal decoder for ASTM F3411 (FAA Remote ID) messages carried in BLE
 * legacy advertising service data (UUID 0xFFFA, application code 0x0D).
 */
data class DroneInfo(
    val macAddress: String,
    val idType: String?,
    val uasId: String?,
    val latitude: Double?,
    val longitude: Double?,
    val altitudeM: Double?,
    val speedMs: Double?,
    val operatorLat: Double?,
    val operatorLon: Double?,
    var lastSeen: Long = System.currentTimeMillis(),
    var rssi: Int = 0
)

object RemoteIdParser {

    fun parse(mac: String, data: ByteArray, rssi: Int): DroneInfo? {
        // data[0] = 0x0D app code, data[1] = message counter, data[2..] = message(s)
        if (data.size < 27 || (data[0].toInt() and 0xFF) != 0x0D) return null
        val msg = data.copyOfRange(2, data.size)
        val header = msg[0].toInt() and 0xFF
        val msgType = (header shr 4) and 0x0F

        var idType: String? = null
        var uasId: String? = null
        var lat: Double? = null
        var lon: Double? = null
        var alt: Double? = null
        var speed: Double? = null
        var opLat: Double? = null
        var opLon: Double? = null

        fun parseOne(m: ByteArray) {
            if (m.size < 25) return
            when ((m[0].toInt() shr 4) and 0x0F) {
                0x0 -> { // Basic ID
                    val t = (m[1].toInt() shr 4) and 0x0F
                    idType = when (t) {
                        1 -> "Serial number"
                        2 -> "CAA registration"
                        3 -> "UTM UUID"
                        else -> "Type $t"
                    }
                    uasId = m.copyOfRange(2, 22).takeWhile { it.toInt() != 0 }
                        .toByteArray().toString(Charsets.US_ASCII).trim()
                }
                0x1 -> { // Location/Vector
                    speed = (m[3].toInt() and 0xFF) * 0.25
                    lat = leInt(m, 5) / 1e7
                    lon = leInt(m, 9) / 1e7
                    alt = (leShort(m, 15) * 0.5) - 1000.0
                }
                0x4 -> { // System (operator location)
                    opLat = leInt(m, 2) / 1e7
                    opLon = leInt(m, 6) / 1e7
                }
            }
        }

        if (msgType == 0xF) {
            // Message pack: [header][blockSize][count][messages...]
            if (msg.size < 3) return null
            val blockSize = msg[1].toInt() and 0xFF
            val count = msg[2].toInt() and 0xFF
            var off = 3
            repeat(count) {
                if (off + blockSize <= msg.size) parseOne(msg.copyOfRange(off, off + blockSize))
                off += blockSize
            }
        } else {
            parseOne(msg)
        }

        if (idType == null && lat == null && opLat == null) return null
        return DroneInfo(mac, idType, uasId, lat, lon, alt, speed, opLat, opLon, rssi = rssi)
    }

    private fun leInt(b: ByteArray, off: Int): Int =
        (b[off].toInt() and 0xFF) or ((b[off + 1].toInt() and 0xFF) shl 8) or
        ((b[off + 2].toInt() and 0xFF) shl 16) or ((b[off + 3].toInt() and 0xFF) shl 24)

    private fun leShort(b: ByteArray, off: Int): Int =
        (b[off].toInt() and 0xFF) or ((b[off + 1].toInt() and 0xFF) shl 8)
}
