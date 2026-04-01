using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace StreetGolf.GPS
{
    /// <summary>
    /// Searches for nearby landmarks/POIs using the OpenStreetMap Overpass API.
    /// Free, no API key required. Results are cached per session.
    /// The game uses these as golf hole targets — play toward real places.
    /// </summary>
    public class LandmarkService : MonoBehaviour
    {
        public static LandmarkService Instance { get; private set; }

        [SerializeField] private float defaultSearchRadius = 500f;
        [SerializeField] private float cacheInvalidateDistance = 200f;
        [SerializeField] private float cacheTimeoutSeconds = 600f;
        [SerializeField] private int maxResults = 20;

        private const string OverpassEndpoint = "https://overpass-api.de/api/interpreter";

        private List<Landmark> cachedLandmarks;
        private GPSPosition cacheCenter;
        private float cacheTimestamp;
        private HashSet<string> playedLandmarks = new HashSet<string>();

        private void Awake()
        {
            if (Instance != null)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        /// <summary>
        /// Search for nearby landmarks. Returns via callback.
        /// Uses cache if available and still valid.
        /// </summary>
        public void SearchNearby(GPSPosition center, float radius, Action<List<Landmark>> callback)
        {
            if (IsCacheValid(center))
            {
                callback?.Invoke(cachedLandmarks);
                return;
            }

            StartCoroutine(FetchLandmarks(center, radius, callback));
        }

        /// <summary>
        /// Pick the best landmark for a given hole number.
        /// Selects progressively farther landmarks as holes advance.
        /// Avoids repeating landmarks already played this session.
        /// </summary>
        public Landmark? SelectForHole(int holeNumber, List<Landmark> landmarks, float minDist = 20f, float maxDist = 500f)
        {
            if (landmarks == null || landmarks.Count == 0)
                return null;

            // Filter to distance range and unplayed
            var candidates = new List<Landmark>();
            foreach (var lm in landmarks)
            {
                if (lm.DistanceMeters >= minDist && lm.DistanceMeters <= maxDist
                    && !playedLandmarks.Contains(LandmarkKey(lm)))
                {
                    candidates.Add(lm);
                }
            }

            if (candidates.Count == 0)
            {
                // Allow replays if all landmarks exhausted
                playedLandmarks.Clear();
                foreach (var lm in landmarks)
                {
                    if (lm.DistanceMeters >= minDist && lm.DistanceMeters <= maxDist)
                        candidates.Add(lm);
                }
            }

            if (candidates.Count == 0)
                return null;

            // Sort by distance
            candidates.Sort((a, b) => a.DistanceMeters.CompareTo(b.DistanceMeters));

            // Pick based on hole number — earlier holes are closer, later ones farther
            int index = Mathf.Clamp(holeNumber - 1, 0, candidates.Count - 1);
            Landmark selected = candidates[index];
            playedLandmarks.Add(LandmarkKey(selected));

            return selected;
        }

        private IEnumerator FetchLandmarks(GPSPosition center, float radius, Action<List<Landmark>> callback)
        {
            string query = BuildOverpassQuery(center, radius);
            string url = $"{OverpassEndpoint}?data={UnityWebRequest.EscapeURL(query)}";

            using var request = UnityWebRequest.Get(url);
            request.timeout = 10;
            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogWarning($"StreetGolf: Landmark search failed: {request.error}");
                callback?.Invoke(null);
                yield break;
            }

            string json = request.downloadHandler.text;
            List<Landmark> results = ParseOverpassResponse(json, center);

            // Cache the results
            cachedLandmarks = results;
            cacheCenter = center;
            cacheTimestamp = Time.time;

            Debug.Log($"StreetGolf: Found {results.Count} landmarks nearby");
            callback?.Invoke(results);
        }

        private string BuildOverpassQuery(GPSPosition center, float radius)
        {
            string lat = center.Latitude.ToString("F6", System.Globalization.CultureInfo.InvariantCulture);
            string lon = center.Longitude.ToString("F6", System.Globalization.CultureInfo.InvariantCulture);
            string rad = radius.ToString("F0", System.Globalization.CultureInfo.InvariantCulture);

            return $@"[out:json][timeout:10];(
node[""tourism""](around:{rad},{lat},{lon});
node[""amenity""~""restaurant|cafe|bar|bank|library|place_of_worship|theatre|cinema|fountain|memorial""](around:{rad},{lat},{lon});
node[""leisure""~""park|playground|garden|pitch""](around:{rad},{lat},{lon});
node[""historic""](around:{rad},{lat},{lon});
node[""artwork""](around:{rad},{lat},{lon});
);out body {maxResults};";
        }

        private List<Landmark> ParseOverpassResponse(string json, GPSPosition origin)
        {
            var results = new List<Landmark>();

            // Overpass returns: { "elements": [ { "lat": ..., "lon": ..., "tags": { "name": ..., ... } } ] }
            // Parse manually since JsonUtility can't handle dynamic keys well
            var response = JsonUtility.FromJson<OverpassResponse>(json);
            if (response?.elements == null)
                return results;

            foreach (var element in response.elements)
            {
                string name = element.tags?.name;
                if (string.IsNullOrEmpty(name))
                    continue;

                var pos = new GPSPosition(element.lat, element.lon);
                float dist = GPSLocationService.DistanceBetween(origin, pos);

                string category = DetermineCategory(element.tags);

                results.Add(new Landmark
                {
                    Name = name,
                    Category = category,
                    Position = pos,
                    DistanceMeters = dist
                });
            }

            results.Sort((a, b) => a.DistanceMeters.CompareTo(b.DistanceMeters));
            return results;
        }

        private string DetermineCategory(OverpassTags tags)
        {
            if (tags == null) return "landmark";
            if (!string.IsNullOrEmpty(tags.tourism)) return tags.tourism;
            if (!string.IsNullOrEmpty(tags.amenity)) return tags.amenity;
            if (!string.IsNullOrEmpty(tags.leisure)) return tags.leisure;
            if (!string.IsNullOrEmpty(tags.historic)) return tags.historic;
            return "landmark";
        }

        private bool IsCacheValid(GPSPosition currentCenter)
        {
            if (cachedLandmarks == null || cachedLandmarks.Count == 0)
                return false;

            if (Time.time - cacheTimestamp > cacheTimeoutSeconds)
                return false;

            float dist = GPSLocationService.DistanceBetween(cacheCenter, currentCenter);
            return dist < cacheInvalidateDistance;
        }

        private string LandmarkKey(Landmark lm)
        {
            return $"{lm.Position.Latitude:F5}_{lm.Position.Longitude:F5}";
        }

        // --- JSON deserialization models for Overpass ---

        [Serializable]
        private class OverpassResponse
        {
            public OverpassElement[] elements;
        }

        [Serializable]
        private class OverpassElement
        {
            public double lat;
            public double lon;
            public OverpassTags tags;
        }

        [Serializable]
        private class OverpassTags
        {
            public string name;
            public string tourism;
            public string amenity;
            public string leisure;
            public string historic;
        }
    }
}
