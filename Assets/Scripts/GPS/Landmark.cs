using System;

namespace StreetGolf.GPS
{
    [Serializable]
    public struct Landmark
    {
        public string Name;
        public string Category;
        public GPSPosition Position;
        public float DistanceMeters;

        public override string ToString()
        {
            return $"{Name} ({Category}) — {DistanceMeters:F0}m";
        }
    }
}
