package com.sentryrf.scanner

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ReportFragment : Fragment() {

    private lateinit var adapter: FindingAdapter
    private var emptyText: TextView? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, s: Bundle?): View =
        inflater.inflate(R.layout.fragment_report, container, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        emptyText = view.findViewById(R.id.list_empty)
        adapter = FindingAdapter()
        val rv = view.findViewById<RecyclerView>(R.id.list_recycler)
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adapter

        view.findViewById<MaterialButton>(R.id.btn_export).setOnClickListener {
            EvidenceReporter.buildAndShare(requireContext())
        }
        view.findViewById<MaterialButton>(R.id.btn_clear).setOnClickListener {
            BleEngine.sightings(requireContext()).clear()
            refresh()
        }
        refresh()
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    private fun refresh() {
        val fmt = SimpleDateFormat("MMM d HH:mm", Locale.US)
        val sightings = BleEngine.sightings(requireContext()).all()
        emptyText?.visibility = if (sightings.isEmpty()) View.VISIBLE else View.GONE

        val rows = mutableListOf<FindingRow>()
        val following = sightings.filter { it.isFollowing() }
        if (following.isNotEmpty()) {
            rows.add(FindingRow.header("⚠ Possible following (${following.size})"))
            following.forEach { rows.add(it.toRow(fmt, ThreatLevel.ALERT)) }
        }
        val rest = sightings.filterNot { it.isFollowing() }
        if (rest.isNotEmpty()) {
            rows.add(FindingRow.header("Sighting history (${rest.size})"))
            rest.forEach { rows.add(it.toRow(fmt, ThreatLevel.INFO)) }
        }
        adapter.submit(rows)
    }

    private fun Sighting.toRow(fmt: SimpleDateFormat, threat: ThreatLevel) = FindingRow(
        "$brand — $kind",
        "Seen ${count}× over ${durationMinutes()} min, across ~${locationSpanMeters().toInt()} m",
        "$deviceId   ${fmt.format(Date(firstSeen))} → ${fmt.format(Date(lastSeen))}   peak $maxRssi dBm",
        threat)
}
