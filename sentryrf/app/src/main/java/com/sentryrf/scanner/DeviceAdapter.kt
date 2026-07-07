package com.sentryrf.scanner

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView

class DeviceAdapter(private val onClick: (DetectedDevice) -> Unit) :
    RecyclerView.Adapter<DeviceAdapter.Holder>() {

    private val items = mutableListOf<DetectedDevice>()

    fun submit(devices: List<DetectedDevice>) {
        items.clear()
        items.addAll(devices)
        notifyDataSetChanged()
    }

    class Holder(v: View) : RecyclerView.ViewHolder(v) {
        val title: TextView = v.findViewById(R.id.item_title)
        val subtitle: TextView = v.findViewById(R.id.item_subtitle)
        val meta: TextView = v.findViewById(R.id.item_meta)
        val badge: TextView = v.findViewById(R.id.item_badge)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder =
        Holder(LayoutInflater.from(parent.context).inflate(R.layout.item_row, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(h: Holder, position: Int) {
        val d = items[position]
        val c = d.classification
        h.title.text = "${c.brand} — ${c.kind}"
        h.subtitle.text = c.detail
        h.meta.text = "%s   %d dBm   ~%.1f m   %d hits".format(
            d.address, d.rssi, d.estimatedMeters(), d.hits)
        val ctx = h.itemView.context
        when (c.threat) {
            ThreatLevel.ALERT -> {
                h.badge.text = ctx.getString(R.string.badge_alert)
                h.badge.setBackgroundColor(ContextCompat.getColor(ctx, R.color.threat_alert))
            }
            ThreatLevel.CAUTION -> {
                h.badge.text = ctx.getString(R.string.badge_caution)
                h.badge.setBackgroundColor(ContextCompat.getColor(ctx, R.color.threat_caution))
            }
            ThreatLevel.INFO -> {
                h.badge.text = ctx.getString(R.string.badge_info)
                h.badge.setBackgroundColor(ContextCompat.getColor(ctx, R.color.threat_info))
            }
        }
        h.itemView.setOnClickListener { onClick(d) }
    }
}
