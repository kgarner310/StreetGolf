package com.sentryrf.scanner

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView

class MainActivity : AppCompatActivity() {

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        requestNeededPermissions()

        val nav = findViewById<BottomNavigationView>(R.id.bottom_nav)
        nav.setOnItemSelectedListener { item ->
            val frag: Fragment = when (item.itemId) {
                R.id.nav_devices -> DevicesFragment()
                R.id.nav_network -> NetworkFragment()
                R.id.nav_sky -> SkyFragment()
                R.id.nav_report -> ReportFragment()
                else -> DashboardFragment()
            }
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragment_container, frag)
                .commit()
            true
        }
        if (savedInstanceState == null) nav.selectedItemId = R.id.nav_dashboard
    }

    private fun requestNeededPermissions() {
        val wanted = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= 31) {
            wanted.add(Manifest.permission.BLUETOOTH_SCAN)
            wanted.add(Manifest.permission.BLUETOOTH_CONNECT)
        }
        wanted.add(Manifest.permission.READ_PHONE_STATE)
        permissionLauncher.launch(wanted.toTypedArray())
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isFinishing) BleEngine.stop(this)
    }
}
