# Golf Game — Location-Seeded Top-Down Par 3

A mobile golf game prototype built in Unity. Tap **"Generate Hole Near Me"** and the app creates a stylized par-3 hole seeded from your real-world GPS coordinates. Same location = same hole.

## Quick Start

1. Open Unity Hub → **Add project from disk** → select this folder
2. Open `Assets/Scenes/MainScene`
3. Press **Play**

The `SceneBootstrap` component on the Bootstrap GameObject creates everything at runtime — no manual wiring needed.

## How to Play

- **Aim:** Touch/click near the ball and **drag backward** (slingshot style)
- **Power:** Drag distance controls power (green = soft, red = full)
- **Shoot:** Release to fire
- **Goal:** Get the ball in the hole (dark circle with red flag) in as few strokes as possible

## Terrain Types

| Terrain | Color | Effect |
|---------|-------|--------|
| Tee Box | Pale green | Normal speed |
| Fairway | Medium green | Normal friction |
| Rough | Dark green | Slows ball faster |
| Green | Light green | Smooth rolling |
| Sand | Tan | Heavy slowdown |
| Water | Blue | Penalty stroke, ball returns to last position |

## Project Structure

```
Assets/
  Scenes/
    MainScene.unity          ← Open this
  Scripts/
    Core/
      SceneBootstrap.cs      ← Auto-creates all GameObjects (attach to empty GO)
      GameManager.cs         ← Game state, scoring, flow
      CameraController.cs    ← Smooth follow + zoom
      LocationProvider.cs    ← GPS or fallback coords
    HoleGeneration/
      HoleGenerator.cs       ← Seeded terrain grid generation
    Ball/
      BallController.cs      ← Slingshot aiming + movement + terrain friction
    UI/
      UIManager.cs           ← All UI built programmatically
```

## How Hole Generation Works

1. GPS coordinates (or fallback) are hashed into a deterministic seed
2. `System.Random` with that seed drives all random decisions
3. A 24×44 tile grid is painted: rough base → tee → green → fairway path → bunkers → water
4. The fairway wobbles with seeded sine curves for organic shape
5. Bunkers cluster around the green, water appears 50% of the time
6. Same lat/lon always generates the same hole

## Building for Mobile

**Android:** File → Build Settings → Android → Switch Platform → Build
**iOS:** File → Build Settings → iOS → Switch Platform → Build → Open in Xcode

Set `locationUsageDescription` in Player Settings for GPS access.

## Requirements

- Unity 2022.3 LTS or newer
- No external packages required (sprites generated at runtime)
