package com.gogogadget.scanner

import android.annotation.SuppressLint
import android.content.Context
import android.telephony.CellInfo
import android.telephony.CellInfoGsm
import android.telephony.CellInfoLte
import android.telephony.CellInfoNr
import android.telephony.CellInfoWcdma
import android.telephony.TelephonyManager

data class CellFinding(
    val tech: String,
    val identity: String,
    val signalDbm: Int,
    val registered: Boolean,
    val threat: ThreatLevel,
    val notes: List<String>
)

/**
 * Reads visible cell towers and flags patterns associated with IMSI
 * catchers: forced 2G service, missing neighbor cells, and unusually
 * strong unregistered cells. Heuristic indicators only — not proof.
 */
object CellAnalyzer {

    @SuppressLint("MissingPermission")
    fun scan(context: Context): List<CellFinding> {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val cells: List<CellInfo> = try { tm.allCellInfo ?: emptyList() } catch (e: SecurityException) { emptyList() }
        if (cells.isEmpty()) return emptyList()

        val registered2gOnly = cells.filter { it.isRegistered }.all { it is CellInfoGsm } &&
            cells.any { it.isRegistered }
        val neighborCount = cells.count { !it.isRegistered }

        return cells.map { c ->
            val notes = mutableListOf<String>()
            var threat = ThreatLevel.INFO
            val (tech, id, dbm) = describe(c)

            if (c.isRegistered && c is CellInfoGsm) {
                notes.add("Serving cell is 2G/GSM — IMSI catchers force 2G to strip encryption")
                threat = if (registered2gOnly) ThreatLevel.ALERT else ThreatLevel.CAUTION
            }
            if (c.isRegistered && neighborCount == 0) {
                notes.add("No neighbor cells visible — isolated cell environment is unusual in coverage areas")
                threat = maxOf(threat, ThreatLevel.CAUTION, compareBy { it.ordinal })
            }
            if (!c.isRegistered && dbm > -60) {
                notes.add("Very strong non-serving cell (${dbm} dBm) — transmitter is unusually close")
                threat = maxOf(threat, ThreatLevel.CAUTION, compareBy { it.ordinal })
            }
            if (notes.isEmpty()) notes.add("No anomalies for this cell")

            CellFinding(tech, id, dbm, c.isRegistered, threat, notes)
        }.sortedByDescending { (if (it.registered) 10000 else 0) + it.threat.ordinal * 1000 }
    }

    private fun describe(c: CellInfo): Triple<String, String, Int> = when (c) {
        is CellInfoNr -> Triple("5G NR", c.cellIdentity.toString().take(80), c.cellSignalStrength.dbm)
        is CellInfoLte -> Triple("LTE",
            "PCI ${c.cellIdentity.pci} TAC ${c.cellIdentity.tac} CI ${c.cellIdentity.ci}",
            c.cellSignalStrength.dbm)
        is CellInfoWcdma -> Triple("3G WCDMA",
            "LAC ${c.cellIdentity.lac} CID ${c.cellIdentity.cid}", c.cellSignalStrength.dbm)
        is CellInfoGsm -> Triple("2G GSM",
            "LAC ${c.cellIdentity.lac} CID ${c.cellIdentity.cid}", c.cellSignalStrength.dbm)
        else -> Triple("Cell", c.toString().take(80), -999)
    }
}
