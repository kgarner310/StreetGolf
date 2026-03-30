using UnityEngine;

/// <summary>
/// Describes the real-world surroundings at a location.
/// Built from OSM Overpass data, then fed into HoleGenerator to shape terrain.
/// </summary>
[System.Serializable]
public class LocationProfile
{
    // --- Biome classification ---
    public Biome biome = Biome.Suburban;

    // --- Nearby feature scores (0.0 = none, 1.0 = dominant) ---
    public float waterScore;     // lakes, rivers, ocean, ponds nearby
    public float parkScore;      // parks, gardens, recreation areas
    public float forestScore;    // woods, tree cover
    public float urbanScore;     // buildings, roads, commercial
    public float coastalScore;   // coastline, beach
    public float desertScore;    // sand, arid land
    public float farmScore;      // farmland, fields
    public float elevationScore; // hills, mountains (0=flat, 1=steep)

    // --- Directional water (which side is water on?) ---
    public WaterSide waterSide = WaterSide.None;

    // --- Derived gameplay modifiers ---
    public float waterHazardChance;   // 0-1, how likely water appears
    public int bunkerCount;           // 0-5
    public float fairwayWidth;        // 0.5 (narrow) to 1.5 (wide)
    public float roughPenalty;        // 0.5 (light) to 1.5 (punishing)
    public string holeName;           // generated name for the hole

    // --- Color theme overrides ---
    public Color? roughColorOverride;
    public Color? fairwayColorOverride;

    public enum Biome
    {
        Urban,       // dense buildings, tight fairway, lots of bunkers
        Suburban,    // default, mixed features
        Park,        // wide open, gentle, few hazards
        Forest,      // narrow fairway, thick rough
        Coastal,     // sandy, wind-exposed, beach bunkers
        Desert,      // wide and sandy, minimal water
        Lakeside,    // water dominant, island-green style
        Mountain,    // elevation changes, narrow
        Farmland     // wide open, minimal hazards
    }

    public enum WaterSide
    {
        None,
        Left,
        Right,
        Front,   // water in front of green
        Surround // island green
    }

    /// <summary>
    /// Creates a default (fallback) profile when OSM data is unavailable.
    /// Uses the coordinate seed to add some variety.
    /// </summary>
    public static LocationProfile CreateDefault(float lat, float lon)
    {
        var profile = new LocationProfile();
        profile.biome = Biome.Suburban;
        profile.waterHazardChance = 0.5f;
        profile.bunkerCount = 2;
        profile.fairwayWidth = 1.0f;
        profile.roughPenalty = 1.0f;
        profile.holeName = $"Hole ({lat:F2}, {lon:F2})";
        return profile;
    }
}
