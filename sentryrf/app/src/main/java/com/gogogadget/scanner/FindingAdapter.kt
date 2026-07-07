package com.gogogadget.scanner

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView

data class FindingRow(
    val title: String,
    val subtitle: String,
    val meta: String,
    val threat: ThreatLevel,
    val isHeader: Boolean = false
) {
    companion object {
        fun header(title: String) = FindingRow(title, "", "", ThreatLevel.INFO, true)
    }
}

class FindingAdapter : RecyclerView.Adapter<FindingAdapter.Holder>() {

    private val items = mutableListOf<FindingRow>()

    fun submit(rows: List<FindingRow>) {
        items.clear()
        items.addAll(rows)
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
        val r = items[position]
        h.title.text = r.title
        h.subtitle.text = r.subtitle
        h.meta.text = r.meta
        h.subtitle.visibility = if (r.subtitle.isBlank()) View.GONE else View.VISIBLE
        h.meta.visibility = if (r.meta.isBlank()) View.GONE else View.VISIBLE
        val ctx = h.itemView.context
        if (r.isHeader) {
            h.badge.visibility = View.GONE
            h.title.setTextColor(ContextCompat.getColor(ctx, R.color.accent))
        } else {
            h.title.setTextColor(ContextCompat.getColor(ctx, R.color.text_primary))
            h.badge.visibility = View.VISIBLE
            when (r.threat) {
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
        }
    }
}
