using System;
using System.Collections;
using UnityEngine;

namespace StreetGolf.GPS
{
    /// <summary>
    /// Manages GPS location tracking and converts real-world coordinates
    /// to Unity world space. The player's physical location becomes the course.
    /// </summary>
    public class GPSLocationService : MonoBehaviour
    {
        public static GPSLocationService Instance { get; private set; }

        public event Action<GPSPosition> OnLocationUpdated;
        public event Action OnLocationLost;

        [SerializeField] private float updateInterval = 1f;
        [SerializeField] private float desiredAccuracyMeters = 5f;

        public GPSPosition CurrentPosition { get; private set; }
        public GPSPosition StartPosition { get; private set; }
        public bool IsTracking { get; private set; }
        public bool HasFix { get; private set; }

        // Meters per degree at equator (approximate)
        private const double MetersPerDegreeLat = 111320.0;

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

        public void StartTracking()
        {
            StartCoroutine(InitializeGPS());
        }

        public void StopTracking()
        {
            IsTracking = false;
            Input.location.Stop();
        }

        private IEnumerator InitializeGPS()
        {
            if (!Input.location.isEnabledByUser)
            {
                Debug.LogError("StreetGolf: Location services not enabled. Please enable GPS.");
                yield break;
            }

            Input.location.Start(desiredAccuracyMeters, desiredAccuracyMeters);

            int timeout = 20;
            while (Input.location.status == LocationServiceStatus.Initializing && timeout > 0)
            {
                yield return new WaitForSeconds(1);
                timeout--;
            }

            if (timeout <= 0 || Input.location.status == LocationServiceStatus.Failed)
            {
                Debug.LogError("StreetGolf: Unable to get GPS fix.");
                yield break;
            }

            HasFix = true;
            IsTracking = true;
            SetStartPosition();

            StartCoroutine(TrackLocation());
        }

        private void SetStartPosition()
        {
            var data = Input.location.lastData;
            StartPosition = new GPSPosition(data.latitude, data.longitude, data.altitude);
            CurrentPosition = StartPosition;
        }

        private IEnumerator TrackLocation()
        {
            while (IsTracking)
            {
                if (Input.location.status == LocationServiceStatus.Running)
                {
                    var data = Input.location.lastData;
                    CurrentPosition = new GPSPosition(data.latitude, data.longitude, data.altitude);
                    HasFix = true;
                    OnLocationUpdated?.Invoke(CurrentPosition);
                }
                else
                {
                    HasFix = false;
                    OnLocationLost?.Invoke();
                }

                yield return new WaitForSeconds(updateInterval);
            }
        }

        /// <summary>
        /// Converts a GPS position to Unity world-space coordinates
        /// relative to the start position (where the player began).
        /// X = east/west offset, Z = north/south offset, Y = altitude difference.
        /// </summary>
        public Vector3 GPSToWorldPosition(GPSPosition target)
        {
            return GPSToWorldPosition(target, StartPosition);
        }

        public static Vector3 GPSToWorldPosition(GPSPosition target, GPSPosition origin)
        {
            double latDiff = target.Latitude - origin.Latitude;
            double lonDiff = target.Longitude - origin.Longitude;

            double metersPerDegreeLon = MetersPerDegreeLat * Math.Cos(origin.Latitude * Math.PI / 180.0);

            float x = (float)(lonDiff * metersPerDegreeLon);
            float z = (float)(latDiff * MetersPerDegreeLat);
            float y = (float)(target.Altitude - origin.Altitude);

            return new Vector3(x, y, z);
        }

        /// <summary>
        /// Converts Unity world position back to GPS coordinates.
        /// </summary>
        public GPSPosition WorldToGPSPosition(Vector3 worldPos)
        {
            double metersPerDegreeLon = MetersPerDegreeLat * Math.Cos(StartPosition.Latitude * Math.PI / 180.0);

            double lat = StartPosition.Latitude + (worldPos.z / MetersPerDegreeLat);
            double lon = StartPosition.Longitude + (worldPos.x / metersPerDegreeLon);
            double alt = StartPosition.Altitude + worldPos.y;

            return new GPSPosition(lat, lon, alt);
        }

        /// <summary>
        /// Distance in meters between two GPS positions.
        /// </summary>
        public static float DistanceBetween(GPSPosition a, GPSPosition b)
        {
            Vector3 offset = GPSToWorldPosition(b, a);
            return new Vector2(offset.x, offset.z).magnitude;
        }

        /// <summary>
        /// Distance in meters from the player's current position to a target.
        /// </summary>
        public float DistanceTo(GPSPosition target)
        {
            return DistanceBetween(CurrentPosition, target);
        }
    }

    [Serializable]
    public struct GPSPosition
    {
        public double Latitude;
        public double Longitude;
        public double Altitude;

        public GPSPosition(double lat, double lon, double alt = 0)
        {
            Latitude = lat;
            Longitude = lon;
            Altitude = alt;
        }

        public override string ToString()
        {
            return $"({Latitude:F6}, {Longitude:F6}, alt:{Altitude:F1}m)";
        }
    }
}
