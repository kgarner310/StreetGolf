package com.gogogadget.scanner

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.google.android.material.button.MaterialButton
import com.google.android.material.snackbar.Snackbar

class DashboardFragment : Fragment(), BleEngine.Listener {

    private var statusText: TextView? = null
    private var alertText: TextView? = null
    private var cautionText: TextView? = null
    private var infoText: TextView? = null
    private var scanButton: MaterialButton? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, s: Bundle?): View =
        inflater.inflate(R.layout.fragment_dashboard, container, false)

    override fun onViewCreated(view: View, s: Bundle?) {
        statusText = view.findViewById(R.id.text_status)
        alertText = view.findViewById(R.id.count_alert)
        cautionText = view.findViewById(R.id.count_caution)
        infoText = view.findViewById(R.id.count_info)
        scanButton = view.findViewById(R.id.btn_scan)

        scanButton?.setOnClickListener {
            val ctx = requireContext()
            if (BleEngine.scanning) {
                BleEngine.stop(ctx)
            } else {
                if (!BleEngine.start(ctx)) {
                    Snackbar.make(view,
                        "Could not start BLE scan — check Bluetooth is on and permissions are granted",
                        Snackbar.LENGTH_LONG).show()
                }
            }
            render()
        }
        render()
    }

    override fun onResume() {
        super.onResume()
        BleEngine.addListener(this)
        render()
    }

    override fun onPause() {
        super.onPause()
        BleEngine.removeListener(this)
    }

    override fun onDevicesUpdated(devices: List<DetectedDevice>) {
        activity?.runOnUiThread { render() }
    }

    private fun render() {
        val (alert, caution, info) = BleEngine.threatCounts()
        alertText?.text = alert.toString()
        cautionText?.text = caution.toString()
        infoText?.text = info.toString()
        if (BleEngine.scanning) {
            statusText?.text = getString(R.string.status_scanning, BleEngine.devices.size)
            scanButton?.text = getString(R.string.stop_scan)
        } else {
            statusText?.text = if (BleEngine.devices.isEmpty())
                getString(R.string.status_idle) else
                getString(R.string.status_stopped, BleEngine.devices.size)
            scanButton?.text = getString(R.string.start_scan)
        }
    }
}
