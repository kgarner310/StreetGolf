# Unity Golf Game — Setup Guide

## Prerequisites

- Unity 2022.3 LTS or newer (2023.x works too)
- Unity Hub installed
- Android Build Support and/or iOS Build Support modules

---

## Step-by-Step Setup

### Step 1: Create New Unity Project

1. Open **Unity Hub** → **New Project**
2. Select **2D (URP)** template (or plain **2D**)
3. Name it `GolfGamePrototype`
4. Create it, then **close** the default scene

### Step 2: Import Scripts

Copy the entire `Assets/Scripts/` folder from this repo into your Unity project's `Assets/Scripts/` folder.

Your structure should look like:
```
Assets/
  Scripts/
    Core/
      GameManager.cs
      LocationProvider.cs
      CameraController.cs
    HoleGeneration/
      HoleGenerator.cs
    Ball/
      BallController.cs
    UI/
      UIManager.cs
```

### Step 3: Create the Scene

1. **File → New Scene** → Save as `MainScene` in `Assets/Scenes/`

### Step 4: Create the Tile Prefab

1. **Right-click in Assets** → Create → **Sprites → Square**
2. Create an empty **GameObject** in the scene
3. Add a **SpriteRenderer** component to it
4. Assign the Square sprite to the SpriteRenderer
5. Set the **Scale** to `(0.48, 0.48, 1)` — slightly smaller than tile size for grid lines
6. **Drag** this GameObject into `Assets/Prefabs/` to create a prefab
7. Name it `TilePrefab`
8. Delete the instance from the scene

### Step 5: Create the Pin Prefab

1. Create an empty **GameObject**
2. Add a **SpriteRenderer** with the Square sprite
3. Set **Color** to red `(255, 50, 50)`
4. Set **Scale** to `(0.2, 0.2, 1)`
5. Drag into `Assets/Prefabs/` as `PinPrefab`
6. Delete from scene

### Step 6: Create the Ball

1. Create an empty **GameObject** named `Ball`
2. Add a **SpriteRenderer** with the Square sprite (or a Circle sprite if available)
3. Set **Color** to white
4. Set **Scale** to `(0.3, 0.3, 1)`
5. Set **Position Z** to `-1` (renders above tiles)
6. Add the **BallController** script component

### Step 7: Create the Aim Line

1. On the `Ball` object, add a **LineRenderer** component
2. Set **Positions Size** to `2`
3. Set **Width** to `0.05`
4. Set **Material** to Default-Line or any unlit material
5. Set **Color** to white with some transparency
6. In BallController, assign this LineRenderer to `aimLine`

### Step 8: Set Up Game Manager

1. Create an empty **GameObject** named `GameManager`
2. Add the **GameManager** script
3. Create a **child** empty GameObject named `HoleContainer`
4. Add the **HoleGenerator** script to `HoleContainer`
5. Assign references:
   - `GameManager.holeGenerator` → HoleContainer
   - `GameManager.ballController` → Ball
   - `HoleGenerator.tilePrefab` → TilePrefab (from Prefabs folder)
   - `HoleGenerator.pinPrefab` → PinPrefab (from Prefabs folder)
   - `BallController.holeGenerator` → HoleContainer

### Step 9: Set Up Camera

1. Select the **Main Camera**
2. Set it to **Orthographic** (should be default in 2D)
3. Set **Orthographic Size** to `8`
4. Set **Position** to `(0, 0, -10)`
5. Set **Background Color** to a dark green `(0.1, 0.3, 0.1)`
6. Add the **CameraController** script
7. Assign `ballTransform` → Ball

### Step 10: Set Up UI

1. Create a **Canvas** (right-click in Hierarchy → UI → Canvas)
2. Set Canvas **Render Mode** to **Screen Space - Overlay**
3. Add a **Canvas Scaler** component → **Scale With Screen Size** → Reference: `1080 x 1920`
4. Add the **UIManager** script to the Canvas

#### Start Panel:
1. Create a **Panel** child named `StartPanel`
2. Add a **Button** child with text "Generate Hole Near Me"
3. Add a title **Text** child: "GOLF" (or whatever you want)
4. Assign: `UIManager.startPanel` → StartPanel, `UIManager.generateButton` → Button

#### Game Panel:
1. Create a **Panel** child named `GamePanel` (set inactive by default)
2. Make it transparent (or semi-transparent top bar)
3. Add **Text** children: `StrokeCountText`, `HoleInfoText`
4. Assign to UIManager fields

#### Hole Complete Panel:
1. Create a **Panel** child named `HoleCompletePanel` (inactive by default)
2. Add **Text** children: `ScoreText`, `ScoreLabelText`
3. Add a **Button**: "Play Again"
4. Assign all to UIManager fields

#### Water Penalty Panel:
1. Create a **Panel** child named `WaterPenaltyPanel` (inactive by default)
2. Add a **Text**: "Water Hazard! +1 Stroke"
3. Assign to UIManager

### Step 11: Wire Everything Up

Double-check all Inspector references are connected:

| Component | Field | Target |
|---|---|---|
| GameManager | holeGenerator | HoleContainer |
| GameManager | ballController | Ball |
| GameManager | uiManager | Canvas (UIManager) |
| HoleGenerator | tilePrefab | TilePrefab |
| HoleGenerator | pinPrefab | PinPrefab |
| BallController | holeGenerator | HoleContainer |
| BallController | aimLine | Ball's LineRenderer |
| CameraController | ballTransform | Ball |
| UIManager | (all panels/buttons/text) | Respective UI objects |

### Step 12: Test in Editor

1. Press **Play**
2. Click "Generate Hole Near Me"
3. A hole should appear with colored tiles
4. Click to aim, hold to charge power, release to shoot
5. Get the ball to the red pin marker

---

## Building for Mobile

### Android
1. **File → Build Settings → Android → Switch Platform**
2. **Player Settings:**
   - Package Name: `com.yourname.golfgame`
   - Minimum API Level: 24
   - Target API Level: 33+
3. Enable **Location** permission in Player Settings → Android → Other Settings
4. **Build and Run** with a connected device

### iOS
1. **File → Build Settings → iOS → Switch Platform**
2. **Player Settings:**
   - Bundle Identifier: `com.yourname.golfgame`
   - Add `NSLocationWhenInUseUsageDescription` in Info.plist
3. **Build** → Open in Xcode → Run on device

---

## How It Works

### Hole Generation
- `HoleGenerator` takes lat/lon, hashes them into a seed
- Uses `System.Random` with that seed for all random decisions
- Same location always generates the same hole layout
- Grid-based: 20x40 tiles, each 0.5 units
- Paints terrain: rough → fairway → green → bunkers → water

### Ball Physics
- No Unity physics engine — custom 2D movement
- Velocity + friction model (friction varies by terrain)
- Water hazard = penalty stroke + return to last safe position
- Ball "drops in" when close to pin and moving slowly

### Scoring
- Tracks strokes per hole
- Water hazard adds 1 penalty stroke
- Par is always 3 (par-3 generator)
- Score labels: Hole-in-One, Eagle, Birdie, Par, Bogey, etc.

---

## Next Steps (Future Versions)

- [ ] Sprite-based terrain instead of colored squares
- [ ] Ball trail / shot arc visualization
- [ ] Wind system (random per hole, affects ball)
- [ ] Multiple hole round (9 or 18)
- [ ] Real GPS integration for unique holes per location
- [ ] Sound effects
- [ ] Haptic feedback on shot
- [ ] Leaderboard per location seed
