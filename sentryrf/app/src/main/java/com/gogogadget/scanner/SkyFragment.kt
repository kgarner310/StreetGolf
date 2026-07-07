package com.gogogadget.scanner

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

class SkyFragment : Fragment(), BleEngine.Listener {

    private lateinit var adapter: FindingAdapter
    private var emptyText: TextView? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, s: Bundle?): View =
        inflater.inflate(R.layout.fragment_list, container, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        view.findViewById<TextView>(R.id.list_title).text = getString(R.string.title_sky)
        emptyText = view.findViewById(R.id.list_empty)
        emptyText?.text = getString(R.string.empty_sky)
        adapter = FindingAdapter()
        val rv = view.findViewById<RecyclerView>(R.id.list_recycler)
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adapter
        refresh(BleEngine.drones.values.toList())
    }

    override fun onResume() {
        super.onResume()
        BleEngine.addListener(this)
        refresh(BleEngine.drones.values.toList())
    }

    override fun onPause() {
        super.onPause()
        BleEngine.removeListener(this)
    }

    override fun onDevicesUpdated(devices: List<DetectedDevice>) {}

    override fun onDroneUpdated(drones: List<DroneInfo>) {
        activity?.runOnUiThread { refresh(drones) }
    }

    private fun refresh(drones: List<DroneInfo>) {
        emptyText?.visibility = if (drones.isEmpty()) View.VISIBLE else View.GONE
        adapter.submit(drones.map { d ->
            val pos = if (d.latitude != null)
                "%.5f, %.5f  alt %.0f m  %.1f m/s".format(
                    d.latitude, d.longitude, d.altitudeM ?: 0.0, d.speedMs ?: 0.0)
            else "position not yet decoded"
            val op = if (d.operatorLat != null)
                "  •  operator at %.5f, %.5f".format(d.operatorLat, d.operatorLon) else ""
            FindingRow(
                "Drone ${d.uasId ?: d.macAddress}",
                "${d.idType ?: "Remote ID"} — $pos$op",
                "${d.macAddress}   ${d.rssi} dBm",
                ThreatLevel.CAUTION)
        })
    }
}
