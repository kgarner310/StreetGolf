using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// Generates a par-3 golf hole from a lat/lon seed.
/// Same coordinates always produce the same hole.
///
/// The hole is built on a grid of tiles, rendered top-down.
/// Terrain types: Rough, Fairway, Green, Sand, Water, Tee.
/// </summary>
public class HoleGenerator : MonoBehaviour
{
    [Header("Grid Settings")]
    public int gridWidth = 20;   // tiles wide
    public int gridHeight = 40;  // tiles tall (hole is vertical)
    public float tileSize = 0.5f;

    [Header("Tile Prefab")]
    public GameObject tilePrefab; // A simple quad with SpriteRenderer

    [Header("Hole Pin")]
    public GameObject pinPrefab;  // Flag/pin marker on the green

    [Header("Terrain Colors")]
    public Color roughColor = new Color(0.18f, 0.42f, 0.14f);    // dark green
    public Color fairwayColor = new Color(0.30f, 0.65f, 0.25f);  // medium green
    public Color greenColor = new Color(0.45f, 0.80f, 0.35f);    // light green
    public Color sandColor = new Color(0.92f, 0.85f, 0.60f);     // tan
    public Color waterColor = new Color(0.20f, 0.45f, 0.75f);    // blue
    public Color teeColor = new Color(0.55f, 0.75f, 0.50f);      // pale green

    // Internal state
    private TerrainType[,] terrainGrid;
    private GameObject[,] tileObjects;
    private Vector2 teePosition;
    private Vector2 greenCenter;
    private Vector2 pinPosition;
    private System.Random seededRandom;

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
    /// Main entry point. Generates a hole from GPS coordinates used as seed.
    /// </summary>
    public void GenerateHole(float latitude, float longitude)
    {
        // Clear any previous hole
        ClearHole();

        // Create deterministic seed from coordinates
        // Multiply by large primes and combine for good distribution
        int seed = HashCoordinates(latitude, longitude);
        seededRandom = new System.Random(seed);

        // Initialize grid with rough (background terrain)
        terrainGrid = new TerrainType[gridWidth, gridHeight];
        for (int x = 0; x < gridWidth; x++)
            for (int y = 0; y < gridHeight; y++)
                terrainGrid[x, y] = TerrainType.Rough;

        // Step 1: Place tee box at bottom center
        PlaceTee();

        // Step 2: Place green at top (with some random offset)
        PlaceGreen();

        // Step 3: Draw fairway connecting tee to green
        DrawFairway();

        // Step 4: Add sand bunkers near the green
        PlaceBunkers();

        // Step 5: Add a water hazard (sometimes)
        PlaceWater();

        // Step 6: Render all tiles
        RenderGrid();

        // Step 7: Place the pin/flag on the green
        PlacePin();

        Debug.Log($"Hole generated with seed {seed} (lat={latitude}, lon={longitude})");
    }

    int HashCoordinates(float lat, float lon)
    {
        // Convert to fixed-point integers (4 decimal places = ~11m resolution)
        int latInt = Mathf.RoundToInt(lat * 10000);
        int lonInt = Mathf.RoundToInt(lon * 10000);

        // Simple hash combining
        int hash = 17;
        hash = hash * 31 + latInt;
        hash = hash * 31 + lonInt;
        return hash;
    }

    void PlaceTee()
    {
        // Tee is at bottom center, 2 tiles wide x 2 tiles tall
        int teeX = gridWidth / 2 - 1;
        int teeY = 2;

        for (int x = teeX; x < teeX + 2; x++)
            for (int y = teeY; y < teeY + 2; y++)
                terrainGrid[x, y] = TerrainType.Tee;

        teePosition = GridToWorld(teeX, teeY + 1);
    }

    void PlaceGreen()
    {
        // Green is near the top, with random X offset
        int greenRadius = 3 + seededRandom.Next(2); // radius 3-4 tiles
        int greenCenterX = gridWidth / 2 + seededRandom.Next(-3, 4);
        int greenCenterY = gridHeight - greenRadius - 3 - seededRandom.Next(3);

        // Clamp to keep green on grid
        greenCenterX = Mathf.Clamp(greenCenterX, greenRadius + 1, gridWidth - greenRadius - 1);
        greenCenterY = Mathf.Clamp(greenCenterY, gridHeight / 2, gridHeight - greenRadius - 2);

        // Draw circular green
        for (int x = 0; x < gridWidth; x++)
        {
            for (int y = 0; y < gridHeight; y++)
            {
                float dist = Vector2.Distance(
                    new Vector2(x, y),
                    new Vector2(greenCenterX, greenCenterY)
                );
                if (dist <= greenRadius)
                {
                    terrainGrid[x, y] = TerrainType.Green;
                }
            }
        }

        greenCenter = new Vector2(greenCenterX, greenCenterY);

        // Pin position: offset from green center
        float pinOffsetX = (float)(seededRandom.NextDouble() * 2 - 1) * (greenRadius * 0.5f);
        float pinOffsetY = (float)(seededRandom.NextDouble() * 2 - 1) * (greenRadius * 0.5f);
        pinPosition = GridToWorld(
            greenCenterX + Mathf.RoundToInt(pinOffsetX),
            greenCenterY + Mathf.RoundToInt(pinOffsetY)
        );
    }

    void DrawFairway()
    {
        // Draw a fairway path from tee to green using a wobbling line
        Vector2 start = new Vector2(gridWidth / 2, 4);
        Vector2 end = greenCenter;

        int fairwayWidth = 2 + seededRandom.Next(2); // 2-3 tiles wide on each side
        int steps = 40;

        float wobbleAmount = 1.5f + (float)seededRandom.NextDouble() * 2f;

        for (int i = 0; i <= steps; i++)
        {
            float t = (float)i / steps;
            float baseX = Mathf.Lerp(start.x, end.x, t);
            float baseY = Mathf.Lerp(start.y, end.y, t);

            // Add sinusoidal wobble for natural shape
            float wobbleFreq = 2f + (float)seededRandom.NextDouble();
            float wobble = Mathf.Sin(t * wobbleFreq * Mathf.PI) * wobbleAmount;
            float centerX = baseX + wobble;

            // Paint fairway tiles around the center line
            for (int dx = -fairwayWidth; dx <= fairwayWidth; dx++)
            {
                int tileX = Mathf.RoundToInt(centerX + dx);
                int tileY = Mathf.RoundToInt(baseY);

                if (tileX >= 0 && tileX < gridWidth && tileY >= 0 && tileY < gridHeight)
                {
                    // Don't overwrite green or tee
                    if (terrainGrid[tileX, tileY] == TerrainType.Rough)
                    {
                        terrainGrid[tileX, tileY] = TerrainType.Fairway;
                    }
                }
            }
        }
    }

    void PlaceBunkers()
    {
        // Place 1-3 bunkers near the green
        int bunkerCount = 1 + seededRandom.Next(3);

        for (int b = 0; b < bunkerCount; b++)
        {
            // Bunker near green, offset to a side
            float angle = (float)seededRandom.NextDouble() * Mathf.PI * 2;
            float dist = 4f + (float)seededRandom.NextDouble() * 2f;

            int bx = Mathf.RoundToInt(greenCenter.x + Mathf.Cos(angle) * dist);
            int by = Mathf.RoundToInt(greenCenter.y + Mathf.Sin(angle) * dist);

            int bunkerRadius = 1 + seededRandom.Next(2);

            for (int x = bx - bunkerRadius; x <= bx + bunkerRadius; x++)
            {
                for (int y = by - bunkerRadius; y <= by + bunkerRadius; y++)
                {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight)
                    {
                        float d = Vector2.Distance(new Vector2(x, y), new Vector2(bx, by));
                        if (d <= bunkerRadius &&
                            terrainGrid[x, y] != TerrainType.Green &&
                            terrainGrid[x, y] != TerrainType.Tee)
                        {
                            terrainGrid[x, y] = TerrainType.Sand;
                        }
                    }
                }
            }
        }
    }

    void PlaceWater()
    {
        // 50% chance of a water hazard
        if (seededRandom.NextDouble() < 0.5) return;

        // Water on one side of the fairway, midway up
        int side = seededRandom.Next(2) == 0 ? -1 : 1;
        int waterCenterX = gridWidth / 2 + side * (4 + seededRandom.Next(3));
        int waterCenterY = gridHeight / 3 + seededRandom.Next(gridHeight / 4);

        int waterRadiusX = 2 + seededRandom.Next(2);
        int waterRadiusY = 2 + seededRandom.Next(3);

        for (int x = waterCenterX - waterRadiusX; x <= waterCenterX + waterRadiusX; x++)
        {
            for (int y = waterCenterY - waterRadiusY; y <= waterCenterY + waterRadiusY; y++)
            {
                if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight)
                {
                    // Elliptical shape
                    float dx = (float)(x - waterCenterX) / waterRadiusX;
                    float dy = (float)(y - waterCenterY) / waterRadiusY;
                    if (dx * dx + dy * dy <= 1f)
                    {
                        if (terrainGrid[x, y] != TerrainType.Green &&
                            terrainGrid[x, y] != TerrainType.Tee)
                        {
                            terrainGrid[x, y] = TerrainType.Water;
                        }
                    }
                }
            }
        }
    }

    void RenderGrid()
    {
        tileObjects = new GameObject[gridWidth, gridHeight];

        // Calculate offset so the grid is centered at (0,0)
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

                GameObject tile = Instantiate(tilePrefab, pos, Quaternion.identity, transform);
                tile.name = $"Tile_{x}_{y}";

                SpriteRenderer sr = tile.GetComponent<SpriteRenderer>();
                if (sr != null)
                {
                    sr.color = GetTerrainColor(terrainGrid[x, y]);
                }

                tileObjects[x, y] = tile;
            }
        }
    }

    void PlacePin()
    {
        if (pinPrefab != null)
        {
            Instantiate(pinPrefab, new Vector3(pinPosition.x, pinPosition.y, -0.5f),
                        Quaternion.identity, transform);
        }
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

    /// <summary>
    /// Convert grid coordinates to world position.
    /// </summary>
    public Vector2 GridToWorld(int gridX, int gridY)
    {
        float offsetX = -(gridWidth * tileSize) / 2f;
        float offsetY = -(gridHeight * tileSize) / 2f;
        return new Vector2(
            offsetX + gridX * tileSize + tileSize / 2f,
            offsetY + gridY * tileSize + tileSize / 2f
        );
    }

    public Vector2 GetTeePosition() => teePosition;
    public Vector2 GetPinPosition() => pinPosition;

    /// <summary>
    /// Returns the terrain type at a world position.
    /// Used by ball controller for lie detection.
    /// </summary>
    public TerrainType GetTerrainAtWorldPos(Vector2 worldPos)
    {
        float offsetX = -(gridWidth * tileSize) / 2f;
        float offsetY = -(gridHeight * tileSize) / 2f;

        int gx = Mathf.FloorToInt((worldPos.x - offsetX) / tileSize);
        int gy = Mathf.FloorToInt((worldPos.y - offsetY) / tileSize);

        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight)
            return terrainGrid[gx, gy];

        return TerrainType.Rough; // off-grid = rough
    }

    void ClearHole()
    {
        // Destroy all child objects (previous hole tiles + pin)
        foreach (Transform child in transform)
        {
            Destroy(child.gameObject);
        }
    }
}
