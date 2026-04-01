using System;
using UnityEngine;
using StreetGolf.GPS;

namespace StreetGolf.Core
{
    /// <summary>
    /// Generates golf holes using the player's real-world surroundings.
    /// Places targets at real GPS coordinates near the player —
    /// across the street, down the block, around the corner.
    /// </summary>
    public class HoleGenerator : MonoBehaviour
    {
        [Header("Hole Distance Settings (meters)")]
        [SerializeField] private float minDistance = 20f;
        [SerializeField] private float maxDistance = 100f;
        [SerializeField] private float distanceScalePerHole = 5f;

        [Header("Par Calculation")]
        [SerializeField] private float metersPerStroke = 30f;
        [SerializeField] private int minPar = 2;
        [SerializeField] private int maxPar = 6;

        /// <summary>
        /// Generate a hole config based on current position and hole number.
        /// Distance scales up as holes progress, like a real course getting harder.
        /// </summary>
        public HoleConfig GenerateHole(GPSPosition playerPosition, int holeNumber)
        {
            // Scale distance with hole number
            float targetDistance = Mathf.Clamp(
                minDistance + (holeNumber - 1) * distanceScalePerHole,
                minDistance, maxDistance);

            // Add some randomness (±20%)
            float variance = UnityEngine.Random.Range(0.8f, 1.2f);
            targetDistance *= variance;

            // Pick a random direction
            float bearing = UnityEngine.Random.Range(0f, 360f);
            float bearingRad = bearing * Mathf.Deg2Rad;

            // Convert distance + bearing to GPS offset
            double latOffset = targetDistance * Math.Cos(bearingRad) / 111320.0;
            double lonOffset = targetDistance * Math.Sin(bearingRad) /
                (111320.0 * Math.Cos(playerPosition.Latitude * Math.PI / 180.0));

            GPSPosition holePosition = new GPSPosition(
                playerPosition.Latitude + latOffset,
                playerPosition.Longitude + lonOffset,
                playerPosition.Altitude
            );

            // Calculate par from distance
            int par = Mathf.Clamp(
                Mathf.CeilToInt(targetDistance / metersPerStroke) + 1,
                minPar, maxPar);

            return new HoleConfig
            {
                TargetPosition = holePosition,
                Par = par,
                DistanceMeters = targetDistance,
                Bearing = bearing,
                HoleName = GenerateHoleName(holeNumber)
            };
        }

        /// <summary>
        /// Generate a hole targeting a specific GPS position (e.g., a landmark).
        /// </summary>
        public HoleConfig GenerateHoleAtTarget(GPSPosition playerPosition, GPSPosition target)
        {
            float distance = GPSLocationService.DistanceBetween(playerPosition, target);
            int par = Mathf.Clamp(
                Mathf.CeilToInt(distance / metersPerStroke) + 1,
                minPar, maxPar);

            return new HoleConfig
            {
                TargetPosition = target,
                Par = par,
                DistanceMeters = distance,
                HoleName = "Custom Hole"
            };
        }

        /// <summary>
        /// Generate a hole from a real-world landmark (POI).
        /// The landmark name becomes the hole name.
        /// </summary>
        public HoleConfig GenerateHoleFromLandmark(GPSPosition playerPosition, Landmark landmark)
        {
            var config = GenerateHoleAtTarget(playerPosition, landmark.Position);
            config.HoleName = landmark.Name;
            config.LandmarkCategory = landmark.Category;
            return config;
        }

        private string GenerateHoleName(int holeNumber)
        {
            string[] streetNames = {
                "The Sidewalk Slider",
                "Curb Appeal",
                "The Alley Oop",
                "Manhole in One",
                "The Fire Hydrant",
                "Crosswalk Crusher",
                "The Parking Lot",
                "Storm Drain Special",
                "The Bus Stop",
                "Corner Pocket",
                "The Dumpster Dive",
                "Mailbox Master",
                "The Pothole",
                "Traffic Cone Alley",
                "The Bench Press",
                "Street Lamp Slalom",
                "The Gutter Ball",
                "Newspaper Box Bounce"
            };

            int index = (holeNumber - 1) % streetNames.Length;
            return streetNames[index];
        }
    }

    [Serializable]
    public struct HoleConfig
    {
        public GPSPosition TargetPosition;
        public int Par;
        public float DistanceMeters;
        public float Bearing;
        public string HoleName;
        public string LandmarkCategory;
    }
}
