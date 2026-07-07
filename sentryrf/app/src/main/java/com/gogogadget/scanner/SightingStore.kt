package com.gogogadget.scanner

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class Sighting(
    val deviceId: String,
    val brand: String,
    val kind: String,
    val firstSeen: Long,
    val lastSeen: Long,
    val count: Int,
    val minLat: Double,
    val maxLat: Double,
    val minLon: Double,
    val maxLon: Double,
    val maxRssi: Int
) {
    /** Rough span of locations this device was seen across, in meters. */
    fun locationSpanMeters(): Double {
        if (minLat > 90) return 0.0
        val dLat = (maxLat - minLat) * 111_320.0
        val dLon = (maxLon - minLon) * 111_320.0 * Math.cos(Math.toRadians((minLat + maxLat) / 2))
        return Math.hypot(dLat, dLon)
    }

    fun durationMinutes(): Long = (lastSeen - firstSeen) / 60_000

    /**
     * Following heuristic: a tracker-class device that has stayed with us for
     * 20+ minutes, or been seen at spots more than 300 m apart, is suspicious.
     */
    fun isFollowing(): Boolean =
        count >= 5 && (durationMinutes() >= 20 || locationSpanMeters() > 300)
}

class SightingStore(context: Context) :
    SQLiteOpenHelper(context, "sightings.db", null, 1) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE sightings (
                device_id TEXT PRIMARY KEY,
                brand TEXT, kind TEXT,
                first_seen INTEGER, last_seen INTEGER, count INTEGER,
                min_lat REAL DEFAULT 999, max_lat REAL DEFAULT -999,
                min_lon REAL DEFAULT 999, max_lon REAL DEFAULT -999,
                max_rssi INTEGER DEFAULT -127)"""
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, old: Int, new: Int) {}

    fun record(deviceId: String, brand: String, kind: String, rssi: Int, lat: Double?, lon: Double?) {
        val now = System.currentTimeMillis()
        val db = writableDatabase
        val cur = db.rawQuery("SELECT count, max_rssi FROM sightings WHERE device_id=?", arrayOf(deviceId))
        if (cur.moveToFirst()) {
            val count = cur.getInt(0) + 1
            val maxRssi = maxOf(cur.getInt(1), rssi)
            cur.close()
            db.execSQL(
                """UPDATE sightings SET last_seen=?, count=?, max_rssi=?,
                   min_lat=MIN(min_lat, ?), max_lat=MAX(max_lat, ?),
                   min_lon=MIN(min_lon, ?), max_lon=MAX(max_lon, ?)
                   WHERE device_id=?""",
                arrayOf(now, count, maxRssi,
                    lat ?: 999.0, lat ?: -999.0, lon ?: 999.0, lon ?: -999.0, deviceId)
            )
        } else {
            cur.close()
            val v = ContentValues().apply {
                put("device_id", deviceId); put("brand", brand); put("kind", kind)
                put("first_seen", now); put("last_seen", now); put("count", 1)
                put("min_lat", lat ?: 999.0); put("max_lat", lat ?: -999.0)
                put("min_lon", lon ?: 999.0); put("max_lon", lon ?: -999.0)
                put("max_rssi", rssi)
            }
            db.insert("sightings", null, v)
        }
    }

    fun all(): List<Sighting> {
        val out = mutableListOf<Sighting>()
        val cur = readableDatabase.rawQuery(
            "SELECT device_id, brand, kind, first_seen, last_seen, count, min_lat, max_lat, min_lon, max_lon, max_rssi FROM sightings ORDER BY last_seen DESC", null)
        while (cur.moveToNext()) {
            out.add(Sighting(cur.getString(0), cur.getString(1), cur.getString(2),
                cur.getLong(3), cur.getLong(4), cur.getInt(5),
                cur.getDouble(6), cur.getDouble(7), cur.getDouble(8), cur.getDouble(9),
                cur.getInt(10)))
        }
        cur.close()
        return out
    }

    fun clear() {
        writableDatabase.execSQL("DELETE FROM sightings")
    }
}
