using System;
using System.Collections;
using UnityEngine;
using StreetGolf.AR;
using StreetGolf.Golf;
using StreetGolf.GPS;

namespace StreetGolf.Core
{
    /// <summary>
    /// Main game flow controller. Manages the lifecycle of a street golf hole:
    /// 1. Player opens app at their location
    /// 2. AR detects the ground, ball is placed at their feet
    /// 3. A hole/target is generated nearby using GPS
    /// 4. Player aims by pointing phone, swipes to hit
    /// 5. Repeat until ball reaches the hole
    /// 6. Score the hole, generate next one
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public event Action<GameState> OnStateChanged;
        public event Action<HoleResult> OnHoleCompleted;
        public event Action<int> OnHoleStarted;

        [Header("References")]
        [SerializeField] private GolfBall ball;
        [SerializeField] private HoleTarget hole;
        [SerializeField] private ShotController shotController;
        [SerializeField] private HoleGenerator holeGenerator;

        [Header("Settings")]
        [SerializeField] private float shotSettleDelay = 1.5f;

        public GameState CurrentState { get; private set; } = GameState.Initializing;
        public int CurrentHoleNumber { get; private set; }
        public int TotalStrokes { get; private set; }
        public HoleResult LastResult { get; private set; }

        private void Awake()
        {
            if (Instance != null)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        private void Start()
        {
            SetState(GameState.Initializing);
            StartCoroutine(InitializeGame());
        }

        private IEnumerator InitializeGame()
        {
            // Start GPS tracking
            GPSLocationService.Instance.StartTracking();

            // Wait for GPS fix
            while (!GPSLocationService.Instance.HasFix)
                yield return new WaitForSeconds(0.5f);

            // Wait for AR ground detection
            SetState(GameState.DetectingSurface);
            while (!ARSurfaceManager.Instance.HasDetectedGround)
                yield return new WaitForSeconds(0.5f);

            // Ready to play
            StartNewHole();
        }

        public void StartNewHole()
        {
            CurrentHoleNumber++;
            ball.ResetShots();

            SetState(GameState.PlacingBall);

            // Place ball at player's feet (AR ground in front of camera)
            if (ARSurfaceManager.Instance.TryGetGroundAhead(out Pose groundPose))
            {
                ball.PlaceAt(groundPose.position);
            }
            else
            {
                // Fallback: place at camera position on ground
                Vector3 camPos = ARCameraController.Instance.MainCamera.transform.position;
                Vector3 camForward = ARCameraController.Instance.GetAimDirection();
                ball.PlaceAt(camPos + camForward * 1f + Vector3.down * camPos.y);
            }

            // Generate a hole target nearby
            HoleConfig holeConfig = holeGenerator.GenerateHole(
                GPSLocationService.Instance.CurrentPosition, CurrentHoleNumber);

            hole.SetTarget(holeConfig.TargetPosition, holeConfig.Par);
            hole.SetBallReference(ball);

            // Subscribe to events
            ball.OnBallResting -= OnBallSettled;
            ball.OnBallResting += OnBallSettled;
            ball.OnBallInHole -= OnBallSunk;
            ball.OnBallInHole += OnBallSunk;

            SetState(GameState.Aiming);
            shotController.EnableShooting();

            OnHoleStarted?.Invoke(CurrentHoleNumber);
        }

        private void OnBallSettled()
        {
            StartCoroutine(HandleBallSettled());
        }

        private IEnumerator HandleBallSettled()
        {
            SetState(GameState.BallSettling);
            yield return new WaitForSeconds(shotSettleDelay);

            // Ball stopped but didn't reach hole — shoot again
            SetState(GameState.Aiming);
            shotController.EnableShooting();
        }

        private void OnBallSunk()
        {
            shotController.DisableShooting();
            SetState(GameState.HoleComplete);

            LastResult = new HoleResult
            {
                HoleNumber = CurrentHoleNumber,
                Strokes = ball.ShotCount,
                Par = hole.Par,
                DistanceMeters = GPSLocationService.Instance.DistanceTo(hole.TargetGPSPosition),
                ScoreName = GetScoreName(ball.ShotCount, hole.Par)
            };

            TotalStrokes += ball.ShotCount;
            OnHoleCompleted?.Invoke(LastResult);
        }

        private void SetState(GameState newState)
        {
            CurrentState = newState;
            OnStateChanged?.Invoke(newState);
        }

        private string GetScoreName(int strokes, int par)
        {
            int diff = strokes - par;
            return diff switch
            {
                <= -3 => "Albatross",
                -2 => "Eagle",
                -1 => "Birdie",
                0 => "Par",
                1 => "Bogey",
                2 => "Double Bogey",
                3 => "Triple Bogey",
                _ => $"+{diff}"
            };
        }
    }

    public enum GameState
    {
        Initializing,
        DetectingSurface,
        PlacingBall,
        Aiming,
        BallInFlight,
        BallSettling,
        HoleComplete,
        RoundComplete
    }

    [Serializable]
    public struct HoleResult
    {
        public int HoleNumber;
        public int Strokes;
        public int Par;
        public float DistanceMeters;
        public string ScoreName;
    }
}
