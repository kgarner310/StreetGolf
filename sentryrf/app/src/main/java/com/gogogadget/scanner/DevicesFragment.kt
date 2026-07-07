package com.gogogadget.scanner

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

class DevicesFragment : Fragment(), BleEngine.Listener {

    private lateinit var adapter: DeviceAdapter
    private var emptyText: TextView? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, s: Bundle?): View =
        inflater.inflate(R.layout.fragment_list, container, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        view.findViewById<TextView>(R.id.list_title).text = getString(R.string.title_devices)
        emptyText = view.findViewById(R.id.list_empty)
        emptyText?.text = getString(R.string.empty_devices)
        adapter = DeviceAdapter { device ->
            ProximityDialog(device.address).show(parentFragmentManager, "proximity")
        }
        val rv = view.findViewById<RecyclerView>(R.id.list_recycler)
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adapter
        refresh(BleEngine.devices.values.toList())
    }

    override fun onResume() {
        super.onResume()
        BleEngine.addListener(this)
        refresh(BleEngine.devices.values.toList())
    }

    override fun onPause() {
        super.onPause()
        BleEngine.removeListener(this)
    }

    override fun onDevicesUpdated(devices: List<DetectedDevice>) {
        activity?.runOnUiThread { refresh(devices) }
    }

    private fun refresh(devices: List<DetectedDevice>) {
        val sorted = devices.sortedWith(
            compareByDescending<DetectedDevice> { it.classification.threat.ordinal }
                .thenByDescending { it.rssi })
        emptyText?.visibility = if (sorted.isEmpty()) View.VISIBLE else View.GONE
        adapter.submit(sorted)
    }
}
