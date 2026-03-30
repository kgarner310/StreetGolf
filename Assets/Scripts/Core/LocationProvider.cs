using UnityEngine;

/// <summary>
/// Provides GPS coordinates. On mobile, requests real device location.
/// In the editor, uses fallback coordinates.
/// Coordinates are used purely as a deterministic seed for hole generation.
/// </summary>
public static class LocationProvider
{
    // Default fallback: Augusta National Golf Club
    private static float fallbackLat = 33.5032f;
    private static float fallbackLon = -82.0232f;

    private static bool locationReady = false;
    private static float cachedLat;
    private static float cachedLon;

    public static Vector2 GetLocation()
    {
        if (locationReady)
            return new Vector2(cachedLat, cachedLon);

#if UNITY_EDITOR
        cachedLat = fallbackLat;
        cachedLon = fallbackLon;
        locationReady = true;
        return new Vector2(cachedLat, cachedLon);
#else
        if (Input.location.status == LocationServiceStatus.Running)
        {
            cachedLat = Input.location.lastData.latitude;
            cachedLon = Input.location.lastData.longitude;
            locationReady = true;
            return new Vector2(cachedLat, cachedLon);
        }
        else
        {
            cachedLat = fallbackLat;
            cachedLon = fallbackLon;
            locationReady = true;
            return new Vector2(cachedLat, cachedLon);
        }
#endif
    }

    public static void StartLocationService()
    {
#if !UNITY_EDITOR
        if (!Input.location.isEnabledByUser)
        {
            Debug.Log("LocationProvider: GPS not enabled. Using fallback.");
            return;
        }
        Input.location.Start(10f, 10f);
        Debug.Log("LocationProvider: GPS started.");
#else
        Debug.Log("LocationProvider: Editor mode — using fallback coordinates.");
#endif
    }

    public static void SetManualLocation(float lat, float lon)
    {
        cachedLat = lat;
        cachedLon = lon;
        locationReady = true;
    }

    public static void ClearCache()
    {
        locationReady = false;
    }
}
