package com.kgarner.adcloser

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.Locale

class AdCloserService : AccessibilityService() {

    companion object {
        private const val TAG = "AdCloserService"

        const val PREFS = "ad_closer_prefs"
        const val KEY_ENABLED = "enabled"

        private const val SCORE_THRESHOLD = 40
        private const val TAP_COOLDOWN_MS = 2500L
        private const val RESCAN_DELAY_MS = 1000L
        private const val MAX_TAPS_PER_WINDOW = 5
        private const val MAX_NODES = 700
        private const val MAX_DEPTH = 45

        // Real dismiss controls, strongest first.
        private val STRONG_CLOSE_PHRASES = listOf(
            "skip ad", "skip ads", "skip video", "close ad", "close advertisement",
            "dismiss ad", "close this ad", "continue to app"
        )
        private val WEAK_CLOSE_PHRASES = listOf(
            "skip", "close", "dismiss", "no thanks", "not now", "cancel"
        )

        // A lone X glyph is only trusted when it also looks like an X:
        // small, clickable, sitting in a corner of the screen.
        private val X_GLYPHS = setOf("x", "×", "✕", "✖", "╳", "✗", "✘")

        private val ID_HINTS = listOf(
            "close", "skip", "dismiss", "cross", "mraid_close", "countdown_skip"
        )

        // Fake-X bait and anything that opens the ad instead of closing it.
        private val NEGATIVE_PHRASES = listOf(
            "install", "download", "open app", "learn more", "shop now", "play now",
            "get app", "get it", "visit site", "sign up", "buy", "order now",
            "subscribe", "watch now", "more info", "click here", "try now",
            "resume", "replay", "reward"
        )

        // "Skip ad in 5", "You can close this ad in 8 seconds", "Ad · 12s", bare "5"
        private val COUNTDOWN_WITH_ACTION = Regex("""\b(?:in|after)\s+\d{1,3}\s*(?:s\b|sec|second)""")
        private val COUNTDOWN_PLAIN = Regex("""(?:^|\s)\d{1,3}\s*(?:s\b|sec|second)|^\s*\d{1,2}\s*$""")

        private val IGNORED_PACKAGE_PREFIXES = listOf(
            "com.android.systemui",
            "com.android.settings",
            "com.android.launcher",
            "com.google.android.apps.nexuslauncher",
            "com.google.android.inputmethod",
            "com.android.inputmethod",
            "com.google.android.gms"
        )
    }

    private data class Candidate(
        val node: AccessibilityNodeInfo,
        val score: Int,
        val bounds: Rect,
        val label: String
    )

    private class ScanResult {
        val candidates = ArrayList<Candidate>()
        var countdownSeen = false
        var nodesVisited = 0
    }

    private val handler = Handler(Looper.getMainLooper())
    private val rescanRunnable = Runnable { scan() }

    private var lastTapTime = 0L
    private var tapsInCurrentWindow = 0
    private var currentWindowPackage: String? = null

    override fun onServiceConnected() {
        Log.i(TAG, "Ad Closer service connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val type = event.eventType
        if (type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
            type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        ) return

        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName) return
        if (IGNORED_PACKAGE_PREFIXES.any { pkg.startsWith(it) }) return
        if (!isEnabledInPrefs()) return

        if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && pkg != currentWindowPackage) {
            currentWindowPackage = pkg
            tapsInCurrentWindow = 0
        }

        scan()
    }

    override fun onInterrupt() {
        handler.removeCallbacks(rescanRunnable)
    }

    override fun onDestroy() {
        handler.removeCallbacks(rescanRunnable)
        super.onDestroy()
    }

    private fun isEnabledInPrefs(): Boolean =
        getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_ENABLED, true)

    private fun scan() {
        val now = System.currentTimeMillis()
        if (now - lastTapTime < TAP_COOLDOWN_MS) return
        if (tapsInCurrentWindow >= MAX_TAPS_PER_WINDOW) return

        val root = rootInActiveWindow ?: return
        val screen = Rect().also { root.getBoundsInScreen(it) }
        if (screen.isEmpty) return

        val result = ScanResult()
        walk(root, 0, screen, result)

        val best = result.candidates.maxByOrNull { it.score }
        if (best != null && best.score >= SCORE_THRESHOLD) {
            Log.d(TAG, "Tapping candidate '${best.label}' score=${best.score} bounds=${best.bounds}")
            if (tap(best)) {
                lastTapTime = System.currentTimeMillis()
                tapsInCurrentWindow++
            }
        } else if (result.countdownSeen) {
            // Countdown running and nothing pressable yet: the Skip/X will show up
            // when the timer expires (or sooner), so keep checking.
            scheduleRescan()
        }
    }

    private fun scheduleRescan() {
        handler.removeCallbacks(rescanRunnable)
        handler.postDelayed(rescanRunnable, RESCAN_DELAY_MS)
    }

    private fun walk(node: AccessibilityNodeInfo, depth: Int, screen: Rect, result: ScanResult) {
        if (depth > MAX_DEPTH || result.nodesVisited >= MAX_NODES) return
        result.nodesVisited++

        if (node.isVisibleToUser) {
            evaluate(node, screen, result)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            walk(child, depth + 1, screen, result)
        }
    }

    private fun evaluate(node: AccessibilityNodeInfo, screen: Rect, result: ScanResult) {
        val text = node.text?.toString()?.trim()?.lowercase(Locale.ROOT).orEmpty()
        val desc = node.contentDescription?.toString()?.trim()?.lowercase(Locale.ROOT).orEmpty()
        val viewId = node.viewIdResourceName?.lowercase(Locale.ROOT).orEmpty()
        val label = desc.ifEmpty { text }

        if (label.isEmpty() && viewId.isEmpty()) return

        if (COUNTDOWN_WITH_ACTION.containsMatchIn(label) ||
            (COUNTDOWN_PLAIN.containsMatchIn(label) && label.length <= 24)
        ) {
            result.countdownSeen = true
        }

        if (NEGATIVE_PHRASES.any { label.contains(it) }) return

        var score = 0

        if (STRONG_CLOSE_PHRASES.any { label == it }) {
            score += 55
        } else if (STRONG_CLOSE_PHRASES.any { label.contains(it) }) {
            score += 40
        } else if (WEAK_CLOSE_PHRASES.any { label == it }) {
            score += 35
        } else if (WEAK_CLOSE_PHRASES.any { label.startsWith("$it ") }) {
            score += 20
        }

        val idName = viewId.substringAfterLast('/')
        if (ID_HINTS.any { idName.contains(it) }) {
            score += 30
        }

        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        if (bounds.isEmpty || !Rect.intersects(bounds, screen)) return

        val density = resources.displayMetrics.density
        val maxDimDp = maxOf(bounds.width(), bounds.height()) / density
        val isSmall = maxDimDp in 8f..72f
        val inTopBand = bounds.centerY() < screen.top + screen.height() / 4
        val nearSideEdge = bounds.centerX() < screen.left + screen.width() / 6 ||
                bounds.centerX() > screen.right - screen.width() / 6

        if (label in X_GLYPHS) {
            score += 25
            score += if (isSmall) 10 else -25
            if (inTopBand && nearSideEdge) score += 15
        }

        if (score <= 0) return

        // "Skip ad in 5s" is a countdown, not a button yet — hold off until the
        // label loses its timer.
        if (COUNTDOWN_WITH_ACTION.containsMatchIn(label)) {
            result.countdownSeen = true
            score -= 45
        }

        if (isSmall && inTopBand) score += 8
        if (node.isClickable || findClickableAncestor(node) != null) score += 10

        if (score >= SCORE_THRESHOLD) {
            result.candidates.add(Candidate(node, score, bounds, label.ifEmpty { idName }))
        }
    }

    private fun findClickableAncestor(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        var current = node.parent
        var hops = 0
        while (current != null && hops < 6) {
            if (current.isClickable) return current
            current = current.parent
            hops++
        }
        return null
    }

    private fun tap(candidate: Candidate): Boolean {
        val node = candidate.node
        if (node.isClickable && node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            return true
        }
        val ancestor = findClickableAncestor(node)
        if (ancestor != null && ancestor.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            return true
        }
        return tapByGesture(candidate.bounds)
    }

    private fun tapByGesture(bounds: Rect): Boolean {
        val path = Path().apply {
            moveTo(bounds.exactCenterX(), bounds.exactCenterY())
        }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 50))
            .build()
        return dispatchGesture(gesture, null, null)
    }
}
