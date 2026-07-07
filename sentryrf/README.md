# Go Go Gadget Scanner — Counter-Surveillance Scanner

A native Android counter-surveillance scanner (SentryRF-style feature set).
Everything runs on-device: no cloud, no accounts, no network calls.

## Capabilities

| Tab | What it does |
|---|---|
| **Scan** | Start/stop a live BLE sweep; threat summary (Alert / Caution / Info counts) |
| **Devices** | Every BLE device in range, fingerprinted by brand: Apple Find My / AirTag (including "separated from owner" state), Samsung SmartTag, Tile, Chipolo, Google Find My Device tags, PebbleBee, Eddystone beacons, generic trackers. Tap a device for a **physical sweep** — a hot/cold proximity meter with geiger-style audio ticks driven by smoothed RSSI. |
| **Network** | WiFi threat scan: evil-twin patterns (same SSID, mixed security), open impostor hotspots, hidden APs, WEP downgrades. Cell tower check: 2G-forcing, isolated-cell and overpowered-cell IMSI-catcher indicators. |
| **Sky** | Drone watch — decodes FAA Remote ID (ASTM F3411) broadcasts over BLE: UAS ID, live position, altitude, speed, and operator location. |
| **Report** | Following detection (trackers that stay with you across time and locations) and a tamper-evident **evidence report** export (JSON with SHA-256 integrity digest) via the share sheet. |

## Building

Requires JDK 17+, Android SDK (API 35), and Gradle 8.9+.

```
echo "sdk.dir=$ANDROID_HOME" > local.properties
gradle assembleDebug
```

APK lands in `app/build/outputs/apk/debug/app-debug.apk`.

## Installing

Copy the APK to the phone and open it (allow "install from unknown sources"),
then grant Bluetooth, Location, and Phone permissions when prompted —
BLE/WiFi/cell scanning on Android requires all three.

## Notes

- Detection heuristics (IMSI-catcher indicators, evil-twin patterns,
  following detection) are **indicators, not proof**.
- Debug-signed build, intended for direct install, not store distribution.
