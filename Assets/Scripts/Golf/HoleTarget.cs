using System;
using UnityEngine;
using StreetGolf.GPS;

namespace StreetGolf.Golf
{
    /// <summary>
    /// The hole/target. Placed at a real-world GPS location.
    /// When the ball gets close enough, it sinks.
    /// The hole can be a manhole cover, storm drain, planter, trash can —
    /// whatever's at that spot in the real world.
    /// </summary>
    public class HoleTarget : MonoBehaviour
    {
        public static HoleTarget Instance { get; private set; }

        public event Action OnBallEnteredHole;

        [Header("Detection")]
        [SerializeField] private float sinkRadius = 0.5f;
        [SerializeField] private float sinkAnimDuration = 0.5f;

        [Header("Visual")]
        [SerializeField] private GameObject holeFlagPrefab;
        [SerializeField] private GameObject holeIndicator;
        [SerializeField] private LineRenderer directionLine;

        public GPSPosition TargetGPSPosition { get; private set; }
        public float DistanceFromBall { get; private set; }
        public int Par { get; private set; }
        public string HoleName { get; private set; }

        private GolfBall ball;

        private void Awake()
        {
            Instance = this;
        }

        /// <summary>
        /// Place the hole at a GPS position. Converts to Unity world space
        /// relative to where the player started.
        /// </summary>
        public void SetTarget(GPSPosition gpsPosition, int par = 3, string holeName = "")
        {
            TargetGPSPosition = gpsPosition;
            Par = par;
            HoleName = holeName;

            if (GPSLocationService.Instance != null)
            {
                Vector3 worldPos = GPSLocationService.Instance.GPSToWorldPosition(gpsPosition);
                transform.position = worldPos;
            }
        }

        /// <summary>
        /// Place hole at a world position (e.g., from AR surface tap).
        /// </summary>
        public void SetTargetAtWorldPosition(Vector3 worldPosition, int par = 3, string holeName = "")
        {
            transform.position = worldPosition;
            Par = par;
            HoleName = holeName;

            if (GPSLocationService.Instance != null)
            {
                TargetGPSPosition = GPSLocationService.Instance.WorldToGPSPosition(worldPosition);
            }
        }

        public void SetBallReference(GolfBall golfBall)
        {
            ball = golfBall;
        }

        private void Update()
        {
            if (ball == null) return;

            DistanceFromBall = Vector3.Distance(
                new Vector3(ball.Position.x, 0, ball.Position.z),
                new Vector3(transform.position.x, 0, transform.position.z));

            UpdateDirectionIndicator();
            CheckBallInHole();
        }

        private void UpdateDirectionIndicator()
        {
            if (directionLine == null) return;

            directionLine.SetPosition(0, ball.Position + Vector3.up * 0.1f);
            directionLine.SetPosition(1, transform.position + Vector3.up * 0.1f);
        }

        private void CheckBallInHole()
        {
            if (ball.State != GolfBall.BallState.Rolling &&
                ball.State != GolfBall.BallState.Resting)
                return;

            if (DistanceFromBall <= sinkRadius)
            {
                ball.SinkInHole();
                OnBallEnteredHole?.Invoke();
            }
        }
    }
}
