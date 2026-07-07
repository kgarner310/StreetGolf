package com.sentryrf.scanner

import android.app.Dialog
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.DialogFragment

/**
 * Hot/cold physical sweep: live smoothed RSSI for one device rendered as a
 * proximity meter with an audio geiger-style tick that speeds up as you
 * close in on the transmitter.
 */
class ProximityDialog(private val address: String) : DialogFragment(), BleEngine.Listener {

    private var meter: ProgressBar? = null
    private var readout: TextView? = null
    private var tone: ToneGenerator? = null
    private val handler = Handler(Looper.getMainLooper())
    private var beeping = false

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val view = layoutInflater.inflate(R.layout.dialog_proximity, null)
        meter = view.findViewById(R.id.proximity_meter)
        readout = view.findViewById(R.id.proximity_readout)
        view.findViewById<TextView>(R.id.proximity_address).text = address
        return AlertDialog.Builder(requireContext())
            .setTitle(R.string.proximity_title)
            .setView(view)
            .setPositiveButton(R.string.close, null)
            .create()
    }

    override fun onResume() {
        super.onResume()
        BleEngine.addListener(this)
        tone = try { ToneGenerator(AudioManager.STREAM_MUSIC, 60) } catch (e: Exception) { null }
        beeping = true
        scheduleBeep()
        update()
    }

    override fun onPause() {
        super.onPause()
        beeping = false
        handler.removeCallbacksAndMessages(null)
        BleEngine.removeListener(this)
        tone?.release()
        tone = null
    }

    override fun onDevicesUpdated(devices: List<DetectedDevice>) {
        activity?.runOnUiThread { update() }
    }

    private fun update() {
        val d = BleEngine.devices[address] ?: return
        // Map RSSI -100 (far) .. -30 (touching) onto 0..100
        val pct = ((d.smoothedRssi + 100.0) / 70.0 * 100.0).coerceIn(0.0, 100.0).toInt()
        meter?.progress = pct
        readout?.text = getString(R.string.proximity_readout,
            d.smoothedRssi.toInt(), d.estimatedMeters())
    }

    private fun scheduleBeep() {
        if (!beeping) return
        val d = BleEngine.devices[address]
        val pct = if (d != null)
            ((d.smoothedRssi + 100.0) / 70.0).coerceIn(0.05, 1.0) else 0.05
        tone?.startTone(ToneGenerator.TONE_PROP_BEEP, 40)
        // 1200 ms between ticks when far, 120 ms when on top of it
        handler.postDelayed({ scheduleBeep() }, (1200 - 1080 * pct).toLong())
    }
}
