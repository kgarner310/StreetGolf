using UnityEngine;

/// <summary>
/// Provides GPS coordinates. On mobile, requests real device location.
/// In the editor, uses fallback coordinates.
/// The coordinates are used purely as a deterministic seed for hole generation.
/// </summary>
public static class LocationProvider
{
    // Default fallback: Augusta National Golf Club
    private static float fallbackLat = 33.5032f;
    private static float fallbackLon = -82.0232f;

    private static bool locationReady = false;
    private static float cachedLat;
    private static float cachedLon;

    /// <summary>
    /// Returns (latitude, longitude). Starts GPS coroutine if needed.
    /// Falls back to default coords if GPS is unavailable.
    /// </summary>
    public static Vector2 GetLocation()
    {
        if (locationReady)
        {
            return new Vector2(cachedLat, cachedLon);
        }

#if UNITY_EDITOR
        // In editor, use fallback
        cachedLat = fallbackLat;
        cachedLon = fallbackLon;
        locationReady = true;
        return new Vector2(cachedLat, cachedLon);
#else
        // On device, try real GPS
        if (Input.location.status == LocationServiceStatus.Running)
        {
            cachedLat = Input.location.lastData.latitude;
            cachedLon = Input.location.lastData.longitude;
            locationReady = true;
            return new Vector2(cachedLat, cachedLon);
        }
        else
        {
            // GPS not ready, use fallback
            cachedLat = fallbackLat;
            cachedLon = fallbackLon;
            locationReady = true;
            return new Vector2(cachedLat, cachedLon);
        }
#endif
    }

    /// <summary>
    /// Call this early (e.g. from GameManager.Awake) to start GPS.
    /// GPS is async on mobile — may not be ready immediately.
    /// </summary>
    public static void StartLocationService()
    {
#if !UNITY_EDITOR
        if (!Input.location.isEnabledByUser)
        {
            Debug.Log("LocationProvider: GPS not enabled by user. Using fallback.");
            return;
        }

        Input.location.Start(10f, 10f); // 10m accuracy, 10m update distance
        Debug.Log("LocationProvider: GPS service started.");
#endif
    }

    /// <summary>
    /// Override location manually (for testing or manual entry).
    /// </summary>
    public static void SetManualLocation(float lat, float lon)
    {
        cachedLat = lat;
        cachedLon = lon;
        locationReady = true;
    }
}
