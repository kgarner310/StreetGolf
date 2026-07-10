package com.kgarner.adcloser

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.materialswitch.MaterialSwitch

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var masterSwitch: MaterialSwitch

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.status_text)
        masterSwitch = findViewById(R.id.master_switch)

        val prefs = getSharedPreferences(AdCloserService.PREFS, MODE_PRIVATE)
        masterSwitch.isChecked = prefs.getBoolean(AdCloserService.KEY_ENABLED, true)
        masterSwitch.setOnCheckedChangeListener { _, checked ->
            prefs.edit().putBoolean(AdCloserService.KEY_ENABLED, checked).apply()
        }

        findViewById<Button>(R.id.open_settings_button).setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
    }

    override fun onResume() {
        super.onResume()
        val enabled = isAccessibilityServiceEnabled()
        statusText.setText(if (enabled) R.string.status_enabled else R.string.status_disabled)
        statusText.setTextColor(if (enabled) Color.parseColor("#2E7D32") else Color.parseColor("#C62828"))
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val expected = "$packageName/${AdCloserService::class.java.name}"
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabledServices.split(':').any { it.equals(expected, ignoreCase = true) }
    }
}
