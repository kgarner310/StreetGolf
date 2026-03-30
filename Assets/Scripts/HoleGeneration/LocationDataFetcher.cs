using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// Queries OpenStreetMap Overpass API to discover what's near a GPS location,
/// then builds a LocationProfile that shapes hole generation.
///
/// Searches a 500m radius for: water, parks, forests, buildings, coastline,
/// farmland, sand, and roads. Classifies into a biome and feature scores.
///
/// Results are cached per rounded coordinate so the same area doesn't re-fetch.
/// Falls back to a default profile if offline or the request fails.
/// </summary>
public class LocationDataFetcher : MonoBehaviour
{
    private const string OVERPASS_URL = "https://overpass-api.de/api/interpreter";
    private const int SEARCH_RADIUS = 500; // meters
    private const float COORD_ROUND = 0.005f; // cache granularity (~500m)

    // Cache: rounded coord key -> profile
    private Dictionary<string, LocationProfile> cache = new Dictionary<string, LocationProfile>();

    // Current fetch state
    private bool isFetching = false;
    public bool IsFetching => isFetching;

    /// <summary>
    /// Fetch location data and invoke callback with the resulting profile.
    /// Returns cached result immediately if available.
    /// Falls back to default profile on failure.
    /// </summary>
    public void FetchProfile(float lat, float lon, System.Action<LocationProfile> onComplete)
    {
        string key = CacheKey(lat, lon);
        if (cache.ContainsKey(key))
        {
            onComplete?.Invoke(cache[key]);
            return;
        }

        StartCoroutine(FetchFromOverpass(lat, lon, key, onComplete));
    }

    IEnumerator FetchFromOverpass(float lat, float lon, string cacheKey,
        System.Action<LocationProfile> onComplete)
    {
        isFetching = true;

        // Overpass QL query: count features by type within radius
        string query = BuildOverpassQuery(lat, lon, SEARCH_RADIUS);
        string postData = "data=" + UnityWebRequest.EscapeURL(query);

        UnityWebRequest www = UnityWebRequest.Post(OVERPASS_URL, postData);
        www.timeout = 10;
        www.SetRequestHeader("User-Agent", "GolfGamePrototype/1.0");

        yield return www.SendWebRequest();

        LocationProfile profile;

        if (www.result == UnityWebRequest.Result.Success)
        {
            string json = www.downloadHandler.text;
            profile = ParseOverpassResponse(json, lat, lon);
            Debug.Log($"LocationDataFetcher: OSM data received for ({lat:F4}, {lon:F4}) → {profile.biome}");
        }
        else
        {
            Debug.LogWarning($"LocationDataFetcher: OSM request failed ({www.error}). Using default profile.");
            profile = LocationProfile.CreateDefault(lat, lon);
        }

        www.Dispose();

        cache[cacheKey] = profile;
        isFetching = false;
        onComplete?.Invoke(profile);
    }

    /// <summary>
    /// Builds an Overpass QL query that counts nearby features by type.
    /// Returns tagged elements within the search radius.
    /// </summary>
    string BuildOverpassQuery(float lat, float lon, int radius)
    {
        // Use invariant formatting for coordinates
        string latStr = lat.ToString("F6", System.Globalization.CultureInfo.InvariantCulture);
        string lonStr = lon.ToString("F6", System.Globalization.CultureInfo.InvariantCulture);
        string r = radius.ToString();

        return "[out:json][timeout:10];" +
            "(" +
            // Water bodies
            $"way[\"natural\"=\"water\"](around:{r},{latStr},{lonStr});" +
            $"way[\"waterway\"](around:{r},{latStr},{lonStr});" +
            $"relation[\"natural\"=\"water\"](around:{r},{latStr},{lonStr});" +
            $"way[\"natural\"=\"coastline\"](around:{r},{latStr},{lonStr});" +
            $"way[\"natural\"=\"beach\"](around:{r},{latStr},{lonStr});" +
            // Parks and green space
            $"way[\"leisure\"=\"park\"](around:{r},{latStr},{lonStr});" +
            $"way[\"leisure\"=\"garden\"](around:{r},{latStr},{lonStr});" +
            $"way[\"leisure\"=\"recreation_ground\"](around:{r},{latStr},{lonStr});" +
            $"way[\"leisure\"=\"golf_course\"](around:{r},{latStr},{lonStr});" +
            // Forest / trees
            $"way[\"natural\"=\"wood\"](around:{r},{latStr},{lonStr});" +
            $"way[\"landuse\"=\"forest\"](around:{r},{latStr},{lonStr});" +
            // Urban / buildings
            $"way[\"building\"](around:{r},{latStr},{lonStr});" +
            $"way[\"landuse\"=\"commercial\"](around:{r},{latStr},{lonStr});" +
            $"way[\"landuse\"=\"residential\"](around:{r},{latStr},{lonStr});" +
            // Farmland
            $"way[\"landuse\"=\"farmland\"](around:{r},{latStr},{lonStr});" +
            $"way[\"landuse\"=\"meadow\"](around:{r},{latStr},{lonStr});" +
            // Sand / desert
            $"way[\"natural\"=\"sand\"](around:{r},{latStr},{lonStr});" +
            $"way[\"natural\"=\"scrub\"](around:{r},{latStr},{lonStr});" +
            ");" +
            "out tags center;";
    }

    /// <summary>
    /// Parse the Overpass JSON response and build a LocationProfile.
    /// Counts features by category, computes scores, classifies biome.
    /// </summary>
    LocationProfile ParseOverpassResponse(string json, float lat, float lon)
    {
        var profile = new LocationProfile();

        // Count features by category
        int waterCount = 0;
        int coastCount = 0;
        int beachCount = 0;
        int parkCount = 0;
        int forestCount = 0;
        int buildingCount = 0;
        int residentialCount = 0;
        int farmCount = 0;
        int sandCount = 0;

        // Simple JSON parsing (avoid dependency on JsonUtility for nested arrays)
        // We look for tag patterns in the response
        string[] elements = json.Split(new string[] { "\"type\":" }, System.StringSplitOptions.None);

        foreach (string element in elements)
        {
            if (element.Contains("\"natural\":\"water\"") || element.Contains("\"natural\": \"water\""))
                waterCount++;
            if (element.Contains("\"waterway\""))
                waterCount++;
            if (element.Contains("\"natural\":\"coastline\"") || element.Contains("\"natural\": \"coastline\""))
                coastCount++;
            if (element.Contains("\"natural\":\"beach\"") || element.Contains("\"natural\": \"beach\""))
                beachCount++;
            if (element.Contains("\"leisure\":\"park\"") || element.Contains("\"leisure\": \"park\"") ||
                element.Contains("\"leisure\":\"garden\"") || element.Contains("\"leisure\": \"garden\"") ||
                element.Contains("\"leisure\":\"golf_course\"") || element.Contains("\"leisure\": \"golf_course\""))
                parkCount++;
            if (element.Contains("\"natural\":\"wood\"") || element.Contains("\"natural\": \"wood\"") ||
                element.Contains("\"landuse\":\"forest\"") || element.Contains("\"landuse\": \"forest\""))
                forestCount++;
            if (element.Contains("\"building\""))
                buildingCount++;
            if (element.Contains("\"landuse\":\"residential\"") || element.Contains("\"landuse\": \"residential\"") ||
                element.Contains("\"landuse\":\"commercial\"") || element.Contains("\"landuse\": \"commercial\""))
                residentialCount++;
            if (element.Contains("\"landuse\":\"farmland\"") || element.Contains("\"landuse\": \"farmland\"") ||
                element.Contains("\"landuse\":\"meadow\"") || element.Contains("\"landuse\": \"meadow\""))
                farmCount++;
            if (element.Contains("\"natural\":\"sand\"") || element.Contains("\"natural\": \"sand\"") ||
                element.Contains("\"natural\":\"scrub\"") || element.Contains("\"natural\": \"scrub\""))
                sandCount++;
        }

        // Compute normalized scores (0-1)
        float total = Mathf.Max(1f, waterCount + coastCount + beachCount + parkCount +
            forestCount + buildingCount + residentialCount + farmCount + sandCount);

        profile.waterScore = Mathf.Clamp01((waterCount * 3f) / total);
        profile.coastalScore = Mathf.Clamp01((coastCount + beachCount) * 4f / total);
        profile.parkScore = Mathf.Clamp01((parkCount * 3f) / total);
        profile.forestScore = Mathf.Clamp01((forestCount * 3f) / total);
        profile.urbanScore = Mathf.Clamp01(((buildingCount + residentialCount) * 1.5f) / total);
        profile.farmScore = Mathf.Clamp01((farmCount * 3f) / total);
        profile.desertScore = Mathf.Clamp01((sandCount * 4f) / total);

        // Classify biome (highest score wins, with tie-breaking)
        profile.biome = ClassifyBiome(profile);

        // Derive gameplay modifiers from biome + scores
        ApplyBiomeModifiers(profile);

        // Generate hole name
        profile.holeName = GenerateHoleName(profile, lat, lon);

        // Determine water placement side using coordinate seed
        if (profile.waterScore > 0.2f)
        {
            int sideSeed = Mathf.RoundToInt(lat * 1000) % 4;
            switch (sideSeed)
            {
                case 0: profile.waterSide = LocationProfile.WaterSide.Left; break;
                case 1: profile.waterSide = LocationProfile.WaterSide.Right; break;
                case 2: profile.waterSide = LocationProfile.WaterSide.Front; break;
                default: profile.waterSide = LocationProfile.WaterSide.Left; break;
            }

            // High water score near coast? Chance of island green
            if (profile.waterScore > 0.6f && profile.coastalScore > 0.3f)
                profile.waterSide = LocationProfile.WaterSide.Surround;
        }

        Debug.Log($"OSM Profile: water={profile.waterScore:F2} park={profile.parkScore:F2} " +
                  $"forest={profile.forestScore:F2} urban={profile.urbanScore:F2} " +
                  $"coastal={profile.coastalScore:F2} farm={profile.farmScore:F2} " +
                  $"sand={profile.desertScore:F2} → {profile.biome}");

        return profile;
    }

    LocationProfile.Biome ClassifyBiome(LocationProfile p)
    {
        // Priority-ordered classification
        if (p.coastalScore > 0.3f) return LocationProfile.Biome.Coastal;
        if (p.waterScore > 0.5f) return LocationProfile.Biome.Lakeside;
        if (p.forestScore > 0.4f) return LocationProfile.Biome.Forest;
        if (p.desertScore > 0.4f) return LocationProfile.Biome.Desert;
        if (p.farmScore > 0.4f) return LocationProfile.Biome.Farmland;
        if (p.parkScore > 0.3f) return LocationProfile.Biome.Park;
        if (p.urbanScore > 0.4f) return LocationProfile.Biome.Urban;
        return LocationProfile.Biome.Suburban;
    }

    void ApplyBiomeModifiers(LocationProfile p)
    {
        switch (p.biome)
        {
            case LocationProfile.Biome.Urban:
                p.fairwayWidth = 0.6f;
                p.bunkerCount = 3 + Mathf.RoundToInt(p.urbanScore * 2);
                p.waterHazardChance = 0.2f;
                p.roughPenalty = 1.3f;
                p.roughColorOverride = new Color(0.20f, 0.35f, 0.18f);  // darker, tighter
                p.fairwayColorOverride = new Color(0.25f, 0.55f, 0.20f);
                break;

            case LocationProfile.Biome.Park:
                p.fairwayWidth = 1.4f;
                p.bunkerCount = 1;
                p.waterHazardChance = 0.3f + p.waterScore * 0.3f;
                p.roughPenalty = 0.7f;
                p.roughColorOverride = new Color(0.20f, 0.45f, 0.18f);  // lush
                p.fairwayColorOverride = new Color(0.30f, 0.68f, 0.25f);
                break;

            case LocationProfile.Biome.Forest:
                p.fairwayWidth = 0.5f;
                p.bunkerCount = 1;
                p.waterHazardChance = 0.3f;
                p.roughPenalty = 1.5f; // thick rough = trees
                p.roughColorOverride = new Color(0.10f, 0.30f, 0.08f);  // deep forest green
                p.fairwayColorOverride = new Color(0.22f, 0.55f, 0.18f);
                break;

            case LocationProfile.Biome.Coastal:
                p.fairwayWidth = 1.0f;
                p.bunkerCount = 3 + Mathf.RoundToInt(p.coastalScore * 3);
                p.waterHazardChance = 0.7f;
                p.roughPenalty = 0.9f;
                p.roughColorOverride = new Color(0.30f, 0.42f, 0.22f);  // links grass
                p.fairwayColorOverride = new Color(0.40f, 0.60f, 0.30f); // sandy-green
                break;

            case LocationProfile.Biome.Desert:
                p.fairwayWidth = 1.2f;
                p.bunkerCount = 4 + Mathf.RoundToInt(p.desertScore * 2);
                p.waterHazardChance = 0.1f;
                p.roughPenalty = 1.2f;
                p.roughColorOverride = new Color(0.55f, 0.48f, 0.30f);  // sandy brown
                p.fairwayColorOverride = new Color(0.35f, 0.55f, 0.25f); // irrigated strip
                break;

            case LocationProfile.Biome.Lakeside:
                p.fairwayWidth = 0.9f;
                p.bunkerCount = 2;
                p.waterHazardChance = 0.9f;
                p.roughPenalty = 1.0f;
                p.roughColorOverride = new Color(0.18f, 0.42f, 0.15f);
                break;

            case LocationProfile.Biome.Farmland:
                p.fairwayWidth = 1.5f;
                p.bunkerCount = 1;
                p.waterHazardChance = 0.2f;
                p.roughPenalty = 0.6f;
                p.roughColorOverride = new Color(0.28f, 0.48f, 0.20f);  // meadow green
                p.fairwayColorOverride = new Color(0.35f, 0.65f, 0.28f);
                break;

            default: // Suburban
                p.fairwayWidth = 1.0f;
                p.bunkerCount = 2;
                p.waterHazardChance = 0.5f;
                p.roughPenalty = 1.0f;
                break;
        }

        // Clamp bunker count
        p.bunkerCount = Mathf.Clamp(p.bunkerCount, 0, 6);
    }

    string GenerateHoleName(LocationProfile p, float lat, float lon)
    {
        string biomePrefix;
        switch (p.biome)
        {
            case LocationProfile.Biome.Urban: biomePrefix = "City"; break;
            case LocationProfile.Biome.Park: biomePrefix = "Park"; break;
            case LocationProfile.Biome.Forest: biomePrefix = "Pines"; break;
            case LocationProfile.Biome.Coastal: biomePrefix = "Links"; break;
            case LocationProfile.Biome.Desert: biomePrefix = "Dunes"; break;
            case LocationProfile.Biome.Lakeside: biomePrefix = "Lakeside"; break;
            case LocationProfile.Biome.Mountain: biomePrefix = "Summit"; break;
            case LocationProfile.Biome.Farmland: biomePrefix = "Meadow"; break;
            default: biomePrefix = "Local"; break;
        }

        // Use coord digits for a unique hole number
        int holeNum = (Mathf.Abs(Mathf.RoundToInt(lat * 100)) + Mathf.Abs(Mathf.RoundToInt(lon * 100))) % 18 + 1;

        return $"{biomePrefix} #{holeNum}";
    }

    string CacheKey(float lat, float lon)
    {
        float rLat = Mathf.Round(lat / COORD_ROUND) * COORD_ROUND;
        float rLon = Mathf.Round(lon / COORD_ROUND) * COORD_ROUND;
        return $"{rLat:F3},{rLon:F3}";
    }
}
