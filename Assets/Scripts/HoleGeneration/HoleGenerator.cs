using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// Generates a top-down par-3 golf hole shaped by real-world surroundings.
/// Takes a LocationProfile (from OSM data) + lat/lon seed.
/// Same coordinates + same surroundings = same hole.
///
/// Biome affects: fairway width, bunker count, water placement, rough penalty,
/// color palette, and overall hole character.
/// </summary>
public class HoleGenerator : MonoBehaviour
{
    [Header("Grid Settings")]
    public int gridWidth = 24;
    public int gridHeight = 44;
    public float tileSize = 0.5f;

    [Header("Default Terrain Colors")]
    public Color roughColor = new Color(0.15f, 0.38f, 0.12f);
    public Color fairwayColor = new Color(0.28f, 0.62f, 0.22f);
    public Color greenColor = new Color(0.42f, 0.78f, 0.32f);
    public Color sandColor = new Color(0.93f, 0.86f, 0.58f);
    public Color waterColor = new Color(0.18f, 0.42f, 0.72f);
    public Color teeColor = new Color(0.50f, 0.72f, 0.45f);
    public Color holeColor = new Color(0.08f, 0.08f, 0.08f);

    // Active colors (may be overridden by biome)
    private Color activeRoughColor;
    private Color activeFairwayColor;

    // Internal state
    private TerrainType[,] terrainGrid;
    private SpriteRenderer[,] tileRenderers;
    private Vector2 teePosition;
    private Vector2 greenCenterWorld;
    private Vector2Int greenCenterGrid;
    private Vector2 pinPosition;
    private int greenRadius;
    private System.Random rng;
    private LocationProfile profile;

    private Transform tileParent;
    private GameObject pinObject;
    private GameObject holeRingObject;

    public enum TerrainType
    {
        Rough,
        Fairway,
        Green,
        Sand,
        Water,
        Tee
    }

    /// <summary>
    /// Generate a hole using real-world location data.
    /// </summary>
    public void GenerateHole(float latitude, float longitude, LocationProfile locationProfile)
    {
        ClearHole();

        profile = locationProfile ?? LocationProfile.CreateDefault(latitude, longitude);

        // Apply biome color overrides
        activeRoughColor = profile.roughColorOverride ?? roughColor;
        activeFairwayColor = profile.fairwayColorOverride ?? fairwayColor;

        int seed = HashCoordinates(latitude, longitude);
        rng = new System.Random(seed);

        terrainGrid = new TerrainType[gridWidth, gridHeight];
        FillGrid(TerrainType.Rough);

        PlaceTee();
        PlaceGreen();
        DrawFairway();
        PlaceBunkers();
        PlaceWater();
        RenderGrid();
        CreatePinVisual();

        Debug.Log($"Hole generated | biome={profile.biome} | name={profile.holeName} | " +
                  $"fw={profile.fairwayWidth:F1} bunkers={profile.bunkerCount} water={profile.waterHazardChance:F1}");
    }

    /// <summary>
    /// Fallback: generate without profile (uses default).
    /// </summary>
    public void GenerateHole(float latitude, float longitude)
    {
        GenerateHole(latitude, longitude, null);
    }

    // --- Terrain placement (now biome-aware) ---

    void FillGrid(TerrainType type)
    {
        for (int x = 0; x < gridWidth; x++)
            for (int y = 0; y < gridHeight; y++)
                terrainGrid[x, y] = type;
    }

    void PlaceTee()
    {
        int cx = gridWidth / 2;
        int cy = 3;

        for (int x = cx - 1; x <= cx + 1; x++)
            for (int y = cy; y <= cy + 1; y++)
                if (InBounds(x, y))
                    terrainGrid[x, y] = TerrainType.Tee;

        teePosition = GridToWorld(cx, cy);
    }

    void PlaceGreen()
    {
        greenRadius = 3 + rng.Next(2);

        int cx = gridWidth / 2 + rng.Next(-3, 4);
        int cy = gridHeight - greenRadius - 4 - rng.Next(4);

        cx = Mathf.Clamp(cx, greenRadius + 1, gridWidth - greenRadius - 1);
        cy = Mathf.Clamp(cy, gridHeight / 2, gridHeight - greenRadius - 2);

        greenCenterGrid = new Vector2Int(cx, cy);
        greenCenterWorld = GridToWorld(cx, cy);

        float stretchX = 0.8f + (float)rng.NextDouble() * 0.4f;
        float stretchY = 0.8f + (float)rng.NextDouble() * 0.4f;

        for (int x = 0; x < gridWidth; x++)
        {
            for (int y = 0; y < gridHeight; y++)
            {
                float dx = (x - cx) / (greenRadius * stretchX);
                float dy = (y - cy) / (greenRadius * stretchY);
                if (dx * dx + dy * dy <= 1f)
                    terrainGrid[x, y] = TerrainType.Green;
            }
        }

        float pinOX = (float)(rng.NextDouble() * 2 - 1) * (greenRadius * 0.4f);
        float pinOY = (float)(rng.NextDouble() * 2 - 1) * (greenRadius * 0.4f);
        int pinGX = cx + Mathf.RoundToInt(pinOX);
        int pinGY = cy + Mathf.RoundToInt(pinOY);
        pinPosition = GridToWorld(pinGX, pinGY);
    }

    void DrawFairway()
    {
        Vector2 start = new Vector2(gridWidth / 2f, 5);
        Vector2 end = new Vector2(greenCenterGrid.x, greenCenterGrid.y);

        // Fairway width scaled by biome
        int baseWidth = 2 + rng.Next(2);
        int width = Mathf.RoundToInt(baseWidth * profile.fairwayWidth);
        width = Mathf.Clamp(width, 1, 6);

        int steps = 50;

        // Forest/Urban = tighter wobble, Park/Farmland = gentle
        float wobbleAmp;
        float wobbleFreq;

        switch (profile.biome)
        {
            case LocationProfile.Biome.Forest:
                wobbleAmp = 2.5f + (float)rng.NextDouble() * 1.5f;
                wobbleFreq = 2.5f + (float)rng.NextDouble() * 1f;
                break;
            case LocationProfile.Biome.Urban:
                wobbleAmp = 1.0f + (float)rng.NextDouble() * 0.5f;
                wobbleFreq = 1.0f + (float)rng.NextDouble() * 0.5f;
                break;
            case LocationProfile.Biome.Coastal:
                wobbleAmp = 2.0f + (float)rng.NextDouble() * 2f;
                wobbleFreq = 1.5f + (float)rng.NextDouble() * 1f;
                break;
            case LocationProfile.Biome.Farmland:
            case LocationProfile.Biome.Park:
                wobbleAmp = 0.8f + (float)rng.NextDouble() * 1f;
                wobbleFreq = 1.0f + (float)rng.NextDouble() * 0.5f;
                break;
            default:
                wobbleAmp = 1.5f + (float)rng.NextDouble() * 2f;
                wobbleFreq = 1.5f + (float)rng.NextDouble() * 1.5f;
                break;
        }

        for (int i = 0; i <= steps; i++)
        {
            float t = (float)i / steps;
            float baseX = Mathf.Lerp(start.x, end.x, t);
            float baseY = Mathf.Lerp(start.y, end.y, t);

            float wobble = Mathf.Sin(t * wobbleFreq * Mathf.PI) * wobbleAmp;
            float taper = Mathf.Sin(t * Mathf.PI);
            int currentWidth = Mathf.RoundToInt(width * (0.6f + 0.4f * taper));

            for (int dx = -currentWidth; dx <= currentWidth; dx++)
            {
                int tx = Mathf.RoundToInt(baseX + wobble + dx);
                int ty = Mathf.RoundToInt(baseY);

                if (InBounds(tx, ty) && terrainGrid[tx, ty] == TerrainType.Rough)
                    terrainGrid[tx, ty] = TerrainType.Fairway;
            }
        }
    }

    void PlaceBunkers()
    {
        int count = profile.bunkerCount;

        // Greenside bunkers
        int greensideBunkers = Mathf.Min(count, 3);
        for (int b = 0; b < greensideBunkers; b++)
        {
            float angle = (float)rng.NextDouble() * Mathf.PI * 2f;
            float dist = greenRadius + 1.5f + (float)rng.NextDouble() * 2.5f;

            int bx = Mathf.RoundToInt(greenCenterGrid.x + Mathf.Cos(angle) * dist);
            int by = Mathf.RoundToInt(greenCenterGrid.y + Mathf.Sin(angle) * dist);

            // Coastal/Desert = bigger bunkers
            int radius = 1 + rng.Next(2);
            if (profile.biome == LocationProfile.Biome.Coastal ||
                profile.biome == LocationProfile.Biome.Desert)
                radius += 1;

            PaintCircle(bx, by, radius, TerrainType.Sand, true);
        }

        // Fairway bunkers (remaining count)
        int fairwayBunkers = count - greensideBunkers;
        for (int b = 0; b < fairwayBunkers; b++)
        {
            int side = rng.Next(2) == 0 ? -1 : 1;
            int fbx = gridWidth / 2 + side * (3 + rng.Next(3)) + rng.Next(-1, 2);
            int fby = gridHeight / 4 + rng.Next(gridHeight / 3);

            int radius = 1 + rng.Next(2);
            PaintCircle(fbx, fby, radius, TerrainType.Sand, true);
        }
    }

    void PlaceWater()
    {
        // Water chance driven by biome profile
        if ((float)rng.NextDouble() > profile.waterHazardChance) return;

        switch (profile.waterSide)
        {
            case LocationProfile.WaterSide.Surround:
                PlaceIslandGreenWater();
                break;
            case LocationProfile.WaterSide.Front:
                PlaceFrontalWater();
                break;
            case LocationProfile.WaterSide.Left:
                PlaceSideWater(-1);
                break;
            case LocationProfile.WaterSide.Right:
                PlaceSideWater(1);
                break;
            default:
                PlaceDefaultWater();
                break;
        }
    }

    void PlaceIslandGreenWater()
    {
        // Water surrounds the green — island green effect
        int waterRadius = greenRadius + 3;
        for (int x = 0; x < gridWidth; x++)
        {
            for (int y = 0; y < gridHeight; y++)
            {
                float dist = Vector2.Distance(
                    new Vector2(x, y),
                    new Vector2(greenCenterGrid.x, greenCenterGrid.y)
                );
                // Water ring: between green edge and water radius
                if (dist > greenRadius + 0.5f && dist <= waterRadius)
                {
                    if (terrainGrid[x, y] != TerrainType.Green && terrainGrid[x, y] != TerrainType.Tee)
                    {
                        // Leave a narrow fairway approach path
                        float angleToTee = Mathf.Atan2(3 - greenCenterGrid.y, gridWidth / 2 - greenCenterGrid.x);
                        float angleToTile = Mathf.Atan2(y - greenCenterGrid.y, x - greenCenterGrid.x);
                        float angleDiff = Mathf.Abs(Mathf.DeltaAngle(angleToTee * Mathf.Rad2Deg, angleToTile * Mathf.Rad2Deg));

                        if (angleDiff > 25f) // Don't flood the approach path
                            terrainGrid[x, y] = TerrainType.Water;
                    }
                }
            }
        }
    }

    void PlaceFrontalWater()
    {
        // Water in front of the green
        int wx = greenCenterGrid.x;
        int wy = greenCenterGrid.y - greenRadius - 3;
        int rx = 4 + rng.Next(3);
        int ry = 2 + rng.Next(2);

        PaintEllipse(wx, wy, rx, ry, TerrainType.Water);
    }

    void PlaceSideWater(int side)
    {
        // Water along one side of the fairway (like a canal or pond)
        int wx = gridWidth / 2 + side * (5 + rng.Next(2));
        int startY = gridHeight / 4;
        int endY = gridHeight * 3 / 4;

        // Elongated water body along the side
        int rx = 2 + rng.Next(2);
        int ry = (endY - startY) / 2;
        int wy = (startY + endY) / 2;

        PaintEllipse(wx, wy, rx, ry, TerrainType.Water);
    }

    void PlaceDefaultWater()
    {
        // Original random water placement
        int side = rng.Next(2) == 0 ? -1 : 1;
        int wx = gridWidth / 2 + side * (4 + rng.Next(3));
        int wy = gridHeight / 3 + rng.Next(gridHeight / 4);

        int rx = 2 + rng.Next(2);
        int ry = 2 + rng.Next(3);

        PaintEllipse(wx, wy, rx, ry, TerrainType.Water);
    }

    void PaintEllipse(int cx, int cy, int rx, int ry, TerrainType type)
    {
        for (int x = cx - rx; x <= cx + rx; x++)
        {
            for (int y = cy - ry; y <= cy + ry; y++)
            {
                if (!InBounds(x, y)) continue;
                float dx = (float)(x - cx) / rx;
                float dy = (float)(y - cy) / ry;
                if (dx * dx + dy * dy <= 1f)
                {
                    if (terrainGrid[x, y] != TerrainType.Green && terrainGrid[x, y] != TerrainType.Tee)
                        terrainGrid[x, y] = type;
                }
            }
        }
    }

    void PaintCircle(int cx, int cy, int radius, TerrainType type, bool skipProtected)
    {
        for (int x = cx - radius; x <= cx + radius; x++)
        {
            for (int y = cy - radius; y <= cy + radius; y++)
            {
                if (!InBounds(x, y)) continue;
                float d = Vector2.Distance(new Vector2(x, y), new Vector2(cx, cy));
                if (d > radius) continue;
                if (skipProtected && (terrainGrid[x, y] == TerrainType.Green || terrainGrid[x, y] == TerrainType.Tee))
                    continue;
                terrainGrid[x, y] = type;
            }
        }
    }

    // --- Rendering ---

    void RenderGrid()
    {
        tileParent = new GameObject("Tiles").transform;
        tileParent.SetParent(transform);

        tileRenderers = new SpriteRenderer[gridWidth, gridHeight];

        float offsetX = -(gridWidth * tileSize) / 2f;
        float offsetY = -(gridHeight * tileSize) / 2f;

        for (int x = 0; x < gridWidth; x++)
        {
            for (int y = 0; y < gridHeight; y++)
            {
                Vector3 pos = new Vector3(
                    offsetX + x * tileSize + tileSize / 2f,
                    offsetY + y * tileSize + tileSize / 2f,
                    0f
                );

                GameObject tile = new GameObject($"T_{x}_{y}");
                tile.transform.position = pos;
                tile.transform.SetParent(tileParent);

                SpriteRenderer sr = tile.AddComponent<SpriteRenderer>();
                sr.sprite = CreateSquareSprite();
                sr.color = GetTerrainColor(terrainGrid[x, y]);
                sr.sortingOrder = 0;

                float scale = tileSize * 0.96f;
                tile.transform.localScale = new Vector3(scale, scale, 1f);

                tileRenderers[x, y] = sr;
            }
        }
    }

    void CreatePinVisual()
    {
        holeRingObject = new GameObject("HoleRing");
        holeRingObject.transform.position = new Vector3(pinPosition.x, pinPosition.y, -0.3f);
        holeRingObject.transform.SetParent(transform);
        SpriteRenderer holeSR = holeRingObject.AddComponent<SpriteRenderer>();
        holeSR.sprite = CreateCircleSprite();
        holeSR.color = holeColor;
        holeSR.sortingOrder = 1;
        holeRingObject.transform.localScale = new Vector3(0.3f, 0.3f, 1f);

        pinObject = new GameObject("Pin");
        pinObject.transform.position = new Vector3(pinPosition.x + 0.08f, pinPosition.y + 0.2f, -0.4f);
        pinObject.transform.SetParent(transform);
        SpriteRenderer pinSR = pinObject.AddComponent<SpriteRenderer>();
        pinSR.sprite = CreateSquareSprite();
        pinSR.color = Color.red;
        pinSR.sortingOrder = 2;
        pinObject.transform.localScale = new Vector3(0.15f, 0.12f, 1f);

        GameObject pole = new GameObject("Pole");
        pole.transform.position = new Vector3(pinPosition.x, pinPosition.y + 0.1f, -0.35f);
        pole.transform.SetParent(transform);
        SpriteRenderer poleSR = pole.AddComponent<SpriteRenderer>();
        poleSR.sprite = CreateSquareSprite();
        poleSR.color = Color.white;
        poleSR.sortingOrder = 2;
        pole.transform.localScale = new Vector3(0.02f, 0.25f, 1f);
    }

    // --- Sprite creation ---

    private static Sprite cachedSquareSprite;
    private static Sprite cachedCircleSprite;

    public static Sprite CreateSquareSprite()
    {
        if (cachedSquareSprite != null) return cachedSquareSprite;

        Texture2D tex = new Texture2D(4, 4);
        Color[] pixels = new Color[16];
        for (int i = 0; i < 16; i++) pixels[i] = Color.white;
        tex.SetPixels(pixels);
        tex.Apply();
        tex.filterMode = FilterMode.Point;

        cachedSquareSprite = Sprite.Create(tex, new Rect(0, 0, 4, 4), new Vector2(0.5f, 0.5f), 4f);
        return cachedSquareSprite;
    }

    public static Sprite CreateCircleSprite()
    {
        if (cachedCircleSprite != null) return cachedCircleSprite;

        int size = 32;
        Texture2D tex = new Texture2D(size, size);
        Color[] pixels = new Color[size * size];
        float center = size / 2f;
        float radius = size / 2f;

        for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float dist = Vector2.Distance(new Vector2(x, y), new Vector2(center, center));
                pixels[y * size + x] = dist <= radius ? Color.white : Color.clear;
            }

        tex.SetPixels(pixels);
        tex.Apply();
        tex.filterMode = FilterMode.Bilinear;

        cachedCircleSprite = Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), (float)size);
        return cachedCircleSprite;
    }

    // --- Public getters ---

    public Vector2 GetTeePosition() => teePosition;
    public Vector2 GetPinPosition() => pinPosition;
    public Vector2 GetGreenCenter() => greenCenterWorld;
    public int GetGreenRadius() => greenRadius;
    public LocationProfile GetProfile() => profile;

    public TerrainType GetTerrainAtWorldPos(Vector2 worldPos)
    {
        float offsetX = -(gridWidth * tileSize) / 2f;
        float offsetY = -(gridHeight * tileSize) / 2f;

        int gx = Mathf.FloorToInt((worldPos.x - offsetX) / tileSize);
        int gy = Mathf.FloorToInt((worldPos.y - offsetY) / tileSize);

        if (InBounds(gx, gy))
            return terrainGrid[gx, gy];

        return TerrainType.Rough;
    }

    public bool IsOnCourse(Vector2 worldPos)
    {
        float offsetX = -(gridWidth * tileSize) / 2f;
        float offsetY = -(gridHeight * tileSize) / 2f;

        int gx = Mathf.FloorToInt((worldPos.x - offsetX) / tileSize);
        int gy = Mathf.FloorToInt((worldPos.y - offsetY) / tileSize);
        return InBounds(gx, gy);
    }

    // --- Helpers ---

    Vector2 GridToWorld(int gx, int gy)
    {
        float offsetX = -(gridWidth * tileSize) / 2f;
        float offsetY = -(gridHeight * tileSize) / 2f;
        return new Vector2(
            offsetX + gx * tileSize + tileSize / 2f,
            offsetY + gy * tileSize + tileSize / 2f
        );
    }

    bool InBounds(int x, int y)
    {
        return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
    }

    int HashCoordinates(float lat, float lon)
    {
        int latInt = Mathf.RoundToInt(lat * 10000);
        int lonInt = Mathf.RoundToInt(lon * 10000);
        int hash = 17;
        hash = hash * 31 + latInt;
        hash = hash * 31 + lonInt;
        return hash;
    }

    Color GetTerrainColor(TerrainType terrain)
    {
        switch (terrain)
        {
            case TerrainType.Fairway: return activeFairwayColor;
            case TerrainType.Green:   return greenColor;
            case TerrainType.Sand:    return sandColor;
            case TerrainType.Water:   return waterColor;
            case TerrainType.Tee:     return teeColor;
            default:                  return activeRoughColor;
        }
    }

    void ClearHole()
    {
        foreach (Transform child in transform)
            Destroy(child.gameObject);

        tileRenderers = null;
        terrainGrid = null;
        cachedSquareSprite = null;
        cachedCircleSprite = null;
    }
}
