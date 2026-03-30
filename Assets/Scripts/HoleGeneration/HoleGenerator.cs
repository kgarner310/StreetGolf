using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// Generates a top-down par-3 golf hole from a lat/lon seed.
/// Same coordinates always produce the same hole.
/// Grid-based terrain: Rough, Fairway, Green, Sand, Water, Tee.
/// </summary>
public class HoleGenerator : MonoBehaviour
{
    [Header("Grid Settings")]
    public int gridWidth = 24;
    public int gridHeight = 44;
    public float tileSize = 0.5f;

    [Header("Terrain Colors")]
    public Color roughColor = new Color(0.15f, 0.38f, 0.12f);
    public Color fairwayColor = new Color(0.28f, 0.62f, 0.22f);
    public Color greenColor = new Color(0.42f, 0.78f, 0.32f);
    public Color sandColor = new Color(0.93f, 0.86f, 0.58f);
    public Color waterColor = new Color(0.18f, 0.42f, 0.72f);
    public Color teeColor = new Color(0.50f, 0.72f, 0.45f);
    public Color holeColor = new Color(0.08f, 0.08f, 0.08f);

    // Internal state
    private TerrainType[,] terrainGrid;
    private SpriteRenderer[,] tileRenderers;
    private Vector2 teePosition;
    private Vector2 greenCenterWorld;
    private Vector2Int greenCenterGrid;
    private Vector2 pinPosition;
    private int greenRadius;
    private System.Random rng;

    // Cached tile parent
    private Transform tileParent;

    // Pin visual
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
    /// Main entry point. Clears previous hole and generates a new one.
    /// </summary>
    public void GenerateHole(float latitude, float longitude)
    {
        ClearHole();

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

        Debug.Log($"Hole generated | seed={seed} | lat={latitude:F4} lon={longitude:F4}");
    }

    // --- Terrain placement ---

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

        // 3x2 tee box
        for (int x = cx - 1; x <= cx + 1; x++)
            for (int y = cy; y <= cy + 1; y++)
                if (InBounds(x, y))
                    terrainGrid[x, y] = TerrainType.Tee;

        teePosition = GridToWorld(cx, cy);
    }

    void PlaceGreen()
    {
        greenRadius = 3 + rng.Next(2); // 3-4

        int cx = gridWidth / 2 + rng.Next(-3, 4);
        int cy = gridHeight - greenRadius - 4 - rng.Next(4);

        cx = Mathf.Clamp(cx, greenRadius + 1, gridWidth - greenRadius - 1);
        cy = Mathf.Clamp(cy, gridHeight / 2, gridHeight - greenRadius - 2);

        greenCenterGrid = new Vector2Int(cx, cy);
        greenCenterWorld = GridToWorld(cx, cy);

        // Slightly elliptical green for variety
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

        // Pin: random offset within green
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

        int width = 2 + rng.Next(2); // 2-3 tiles each side
        int steps = 50;

        // Pick a random wobble pattern
        float wobbleAmp = 1.5f + (float)rng.NextDouble() * 2f;
        float wobbleFreq = 1.5f + (float)rng.NextDouble() * 1.5f;

        for (int i = 0; i <= steps; i++)
        {
            float t = (float)i / steps;
            float baseX = Mathf.Lerp(start.x, end.x, t);
            float baseY = Mathf.Lerp(start.y, end.y, t);

            // Sinusoidal wobble
            float wobble = Mathf.Sin(t * wobbleFreq * Mathf.PI) * wobbleAmp;

            // Taper fairway: wider in middle, narrower at tee and green
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
        int count = 1 + rng.Next(3); // 1-3

        for (int b = 0; b < count; b++)
        {
            float angle = (float)rng.NextDouble() * Mathf.PI * 2f;
            float dist = greenRadius + 1.5f + (float)rng.NextDouble() * 2.5f;

            int bx = Mathf.RoundToInt(greenCenterGrid.x + Mathf.Cos(angle) * dist);
            int by = Mathf.RoundToInt(greenCenterGrid.y + Mathf.Sin(angle) * dist);
            int radius = 1 + rng.Next(2);

            PaintCircle(bx, by, radius, TerrainType.Sand, true);
        }

        // Occasional fairway bunker (30% chance)
        if (rng.NextDouble() < 0.3)
        {
            int fbx = gridWidth / 2 + (rng.Next(2) == 0 ? -4 : 4) + rng.Next(-1, 2);
            int fby = gridHeight / 3 + rng.Next(4);
            PaintCircle(fbx, fby, 1 + rng.Next(1), TerrainType.Sand, true);
        }
    }

    void PlaceWater()
    {
        // 50% chance of water
        if (rng.NextDouble() < 0.5) return;

        int side = rng.Next(2) == 0 ? -1 : 1;
        int wx = gridWidth / 2 + side * (4 + rng.Next(3));
        int wy = gridHeight / 3 + rng.Next(gridHeight / 4);

        int rx = 2 + rng.Next(2);
        int ry = 2 + rng.Next(3);

        for (int x = wx - rx; x <= wx + rx; x++)
        {
            for (int y = wy - ry; y <= wy + ry; y++)
            {
                if (!InBounds(x, y)) continue;
                float dx = (float)(x - wx) / rx;
                float dy = (float)(y - wy) / ry;
                if (dx * dx + dy * dy <= 1f)
                {
                    if (terrainGrid[x, y] != TerrainType.Green && terrainGrid[x, y] != TerrainType.Tee)
                        terrainGrid[x, y] = TerrainType.Water;
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

                // Scale sprite to tile size with tiny gap for grid effect
                float scale = tileSize * 0.96f;
                tile.transform.localScale = new Vector3(scale, scale, 1f);

                tileRenderers[x, y] = sr;
            }
        }
    }

    void CreatePinVisual()
    {
        // Hole (dark circle)
        holeRingObject = new GameObject("HoleRing");
        holeRingObject.transform.position = new Vector3(pinPosition.x, pinPosition.y, -0.3f);
        holeRingObject.transform.SetParent(transform);
        SpriteRenderer holeSR = holeRingObject.AddComponent<SpriteRenderer>();
        holeSR.sprite = CreateCircleSprite();
        holeSR.color = holeColor;
        holeSR.sortingOrder = 1;
        holeRingObject.transform.localScale = new Vector3(0.3f, 0.3f, 1f);

        // Pin flag (small red square above hole)
        pinObject = new GameObject("Pin");
        pinObject.transform.position = new Vector3(pinPosition.x + 0.08f, pinPosition.y + 0.2f, -0.4f);
        pinObject.transform.SetParent(transform);
        SpriteRenderer pinSR = pinObject.AddComponent<SpriteRenderer>();
        pinSR.sprite = CreateSquareSprite();
        pinSR.color = Color.red;
        pinSR.sortingOrder = 2;
        pinObject.transform.localScale = new Vector3(0.15f, 0.12f, 1f);

        // Flagpole (thin white line)
        GameObject pole = new GameObject("Pole");
        pole.transform.position = new Vector3(pinPosition.x, pinPosition.y + 0.1f, -0.35f);
        pole.transform.SetParent(transform);
        SpriteRenderer poleSR = pole.AddComponent<SpriteRenderer>();
        poleSR.sprite = CreateSquareSprite();
        poleSR.color = Color.white;
        poleSR.sortingOrder = 2;
        pole.transform.localScale = new Vector3(0.02f, 0.25f, 1f);
    }

    // --- Sprite creation (runtime, no asset files needed) ---

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
        {
            for (int x = 0; x < size; x++)
            {
                float dist = Vector2.Distance(new Vector2(x, y), new Vector2(center, center));
                pixels[y * size + x] = dist <= radius ? Color.white : Color.clear;
            }
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
            case TerrainType.Fairway: return fairwayColor;
            case TerrainType.Green:   return greenColor;
            case TerrainType.Sand:    return sandColor;
            case TerrainType.Water:   return waterColor;
            case TerrainType.Tee:     return teeColor;
            default:                  return roughColor;
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
