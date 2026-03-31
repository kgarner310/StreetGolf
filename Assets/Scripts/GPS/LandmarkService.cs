using System;
using System.Collections.Generic;
using UnityEngine;

namespace StreetGolf.GPS
{
    [Serializable]
    public struct Landmark
    {
        public string Name;
        public GPSPosition Position;
        public float Popularity; // Higher is more likely to be selected

        public Landmark(string name, GPSPosition position, float popularity)
        {
            Name = name;
            Position = position;
            Popularity = popularity;
        }
    }

    /// <summary>
    /// Provides regional landmark choices for "green" targets.
    /// Falls back to random hole generation if no landmark is available.
    /// </summary>
    public class LandmarkService : MonoBehaviour
    {
        public static LandmarkService Instance { get; private set; }

        [Tooltip("Maximum distance in meters to consider a landmark as reachable.")]
        [SerializeField] private float maxLandmarkDistance = 1200f;

        [Header("Sample landmark data (world-relative in GPS)")]
        [SerializeField] private List<Landmark> defaultLandmarks = new List<Landmark>();

        public IReadOnlyList<Landmark> Landmarks => defaultLandmarks;

        private void Awake()
        {
            if (Instance != null)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);
            InitializeDefaultLandmarks();
        }

        private void InitializeDefaultLandmarks()
        {
            if (defaultLandmarks.Count > 0)
                return;

            // Example landmarks, adjust to your region and game area.
            defaultLandmarks.Add(new Landmark("City Square", new GPSPosition(37.7749, -122.4194), 1.0f));
            defaultLandmarks.Add(new Landmark("Main Train Station", new GPSPosition(37.7765, -122.4175), 0.9f));
            defaultLandmarks.Add(new Landmark("Riverside Park", new GPSPosition(37.7802, -122.4233), 0.8f));
            defaultLandmarks.Add(new Landmark("Museum Plaza", new GPSPosition(37.7858, -122.4010), 0.7f));
            defaultLandmarks.Add(new Landmark("Landmark Tower", new GPSPosition(37.7936, -122.3965), 0.75f));
        }

        public bool TryGetBestLandmark(GPSPosition userLocation, out Landmark selected)
        {
            selected = default;

            if (defaultLandmarks == null || defaultLandmarks.Count == 0)
                return false;

            Landmark best = defaultLandmarks[0];
            float bestScore = float.MinValue;

            foreach (var candidate in defaultLandmarks)
            {
                float distance = GPSLocationService.DistanceBetween(userLocation, candidate.Position);
                if (distance > maxLandmarkDistance)
                    continue;

                // prioritize proximity and popularity
                float score = candidate.Popularity / (1f + distance * 0.001f);
                if (score > bestScore)
                {
                    bestScore = score;
                    best = candidate;
                }
            }

            if (bestScore == float.MinValue)
                return false;

            selected = best;
            return true;
        }
    }
}