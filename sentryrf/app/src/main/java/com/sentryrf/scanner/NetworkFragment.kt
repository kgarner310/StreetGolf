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
import java.util.concurrent.Executors

class NetworkFragment : Fragment() {

    private lateinit var adapter: FindingAdapter
    private var emptyText: TextView? = null
    private val executor = Executors.newSingleThreadExecutor()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, s: Bundle?): View =
        inflater.inflate(R.layout.fragment_network, container, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        emptyText = view.findViewById(R.id.list_empty)
        adapter = FindingAdapter()
        val rv = view.findViewById<RecyclerView>(R.id.list_recycler)
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adapter

        view.findViewById<MaterialButton>(R.id.btn_wifi_scan).setOnClickListener { runScan() }
        runScan()
    }

    private fun runScan() {
        emptyText?.text = getString(R.string.scanning_network)
        emptyText?.visibility = View.VISIBLE
        val appCtx = requireContext().applicationContext
        executor.execute {
            val wifi = WifiAnalyzer.scan(appCtx)
            val cells = CellAnalyzer.scan(appCtx)
            val rows = mutableListOf<FindingRow>()
            rows.add(FindingRow.header("WiFi networks (${wifi.size})"))
            wifi.forEach {
                rows.add(FindingRow("${it.ssid}  [${it.security}]",
                    it.notes.joinToString(" • "),
                    "${it.bssid}   ch ${it.channel}   ${it.rssi} dBm", it.threat))
            }
            rows.add(FindingRow.header("Cell towers (${cells.size})"))
            if (cells.isEmpty()) {
                rows.add(FindingRow("No cell data", "Grant phone/location permissions or insert a SIM",
                    "", ThreatLevel.INFO))
            }
            cells.forEach {
                rows.add(FindingRow(
                    "${it.tech}${if (it.registered) " (serving)" else ""}",
                    it.notes.joinToString(" • "),
                    "${it.identity}   ${it.signalDbm} dBm", it.threat))
            }
            activity?.runOnUiThread {
                if (!isAdded) return@runOnUiThread
                emptyText?.visibility = View.GONE
                adapter.submit(rows)
            }
        }
    }
}
