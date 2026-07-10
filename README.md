# Ad Closer

An Android app that automatically closes full-screen ads that pop up in **other** apps, using an [AccessibilityService](https://developer.android.com/guide/topics/ui/accessibility/service).

## What it does

When an ad appears in any app on the phone, Ad Closer scans the screen and:

1. **Cuts the ad short when possible** — the moment a *Skip ad* / *Skip video* button becomes pressable, it presses it.
2. **Waits out the timer when it can't** — if the ad shows a countdown ("You can close this ad in 5s", "Skip ad in 3"…), it holds off and re-checks every second, tapping the close control the instant it appears.
3. **Finds the right X** — it scores every element on screen and only taps a lone "X"/"×"/"✕" when it actually looks like a close button: small, clickable, in a corner of the screen, or labelled `close` / `dismiss` / `skip` in its text, content description, or view ID.
4. **Avoids fake X buttons** — anything whose label says *Install*, *Download*, *Learn more*, *Shop now*, *Play now*, etc. is never tapped, so it won't accidentally open the ad.

Safety rails: a 2.5-second cooldown between taps, a cap of 5 taps per window, and an ignore list for system UI, launchers, keyboards, and Settings. A master switch in the app turns the whole thing off without revoking the accessibility permission.

## Building

Open the project in **Android Studio** (Hedgehog or newer) and run it, or from the command line with the Android SDK installed:

```bash
./gradlew assembleDebug
# APK lands in app/build/outputs/apk/debug/
```

## Setup on the phone

1. Install and open **Ad Closer**.
2. Make sure the **Auto-close ads** switch is on.
3. Tap **Open Accessibility Settings** and enable the *Ad Closer* service (under Installed apps / Downloaded services).
4. That's it — go use your other apps. When an ad pops up, it gets dismissed as soon as the ad allows it.

## How the detection works

The service listens for window-change events from other apps and walks the
accessibility node tree (capped at 700 nodes / depth 45 to stay cheap). Each
node is scored:

| Signal | Points |
|---|---|
| Exact "skip ad" / "close ad" style label | +55 |
| Label contains a strong close phrase | +40 |
| Exact weak label ("close", "skip", "dismiss", "no thanks") | +35 |
| View ID contains `close` / `skip` / `dismiss` / `mraid_close` | +30 |
| Lone X glyph (×, ✕, ✖ …) | +25, plus bonuses for being small and corner-positioned |
| Clickable (or has a clickable ancestor) | +10 |
| Label still contains a countdown ("skip ad **in 5s**") | −45 (wait) |
| Label contains bait words (install, download, learn more…) | disqualified |

The best candidate above the threshold gets tapped — first with an
accessibility `ACTION_CLICK`, then via a clickable ancestor, and as a last
resort with a dispatched tap gesture at the element's center. If only a
countdown is found, the service schedules a re-scan one second later and
keeps waiting until a pressable control shows up.

## Notes & caveats

- This is for **personal use**. Apps that auto-interact with other apps' ads violate Google Play policy, so this is a sideload-only project — don't publish it to the Play Store.
- Ad UIs vary wildly; the phrase/ID lists in `AdCloserService.kt` are the tuning knobs. Add patterns there when you meet an ad it doesn't catch.
- Ads rendered purely in WebView/canvas sometimes expose no accessibility nodes; those can only be caught if the SDK exposes its native close button (most do).

## Moving this to its own repository

This project lives on an orphan branch (`claude/android-ad-closer-ujr40a`) with no StreetGolf history. To make it a standalone repo, create an empty repo on GitHub (e.g. `AdCloser`), then:

```bash
git clone --branch claude/android-ad-closer-ujr40a https://github.com/kgarner310/StreetGolf.git AdCloser
cd AdCloser
git remote set-url origin https://github.com/kgarner310/AdCloser.git
git push -u origin claude/android-ad-closer-ujr40a:main
```
