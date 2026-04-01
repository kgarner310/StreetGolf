using System;
using UnityEngine;
using StreetGolf.AR;

namespace StreetGolf.Golf
{
    /// <summary>
    /// Handles shot input — the player aims by pointing their phone,
    /// then swipes up to hit. Swipe speed/distance controls power.
    /// </summary>
    public class ShotController : MonoBehaviour
    {
        public static ShotController Instance { get; private set; }

        public event Action<float> OnPowerChanged;   // 0-1 normalized power
        public event Action<Vector3> OnAimUpdated;    // Current aim direction
        public event Action OnShotFired;
        public event Action OnReadyToShoot;

        [Header("Shot Settings")]
        [SerializeField] private float minPower = 2f;
        [SerializeField] private float maxPower = 25f;
        [SerializeField] private float swipePowerMultiplier = 0.02f;
        [SerializeField] private float launchAngleLow = 15f;
        [SerializeField] private float launchAngleHigh = 45f;

        [Header("References")]
        [SerializeField] private GolfBall ball;

        public bool CanShoot { get; private set; }
        public float CurrentPower { get; private set; }
        public Vector3 AimDirection { get; private set; }

        private Vector2 swipeStart;
        private bool isSwiping;
        private bool isAiming;

        private void Awake()
        {
            Instance = this;
        }

        public void Initialize(GolfBall golfBall)
        {
            ball = golfBall;
        }

        public void EnableShooting()
        {
            CanShoot = true;
            isAiming = true;
            OnReadyToShoot?.Invoke();
        }

        public void DisableShooting()
        {
            CanShoot = false;
            isAiming = false;
        }

        private void Update()
        {
            if (!CanShoot) return;

            UpdateAimDirection();
            HandleTouchInput();
        }

        private void UpdateAimDirection()
        {
            if (!isAiming) return;

            if (ARCameraController.Instance != null)
            {
                AimDirection = ARCameraController.Instance.GetAimDirection();
                OnAimUpdated?.Invoke(AimDirection);
            }
        }

        private void HandleTouchInput()
        {
            if (Input.touchCount == 0) return;

            Touch touch = Input.GetTouch(0);

            switch (touch.phase)
            {
                case TouchPhase.Began:
                    swipeStart = touch.position;
                    isSwiping = true;
                    CurrentPower = 0;
                    break;

                case TouchPhase.Moved:
                    if (isSwiping)
                    {
                        float swipeDistance = (touch.position - swipeStart).magnitude;
                        float normalizedPower = Mathf.Clamp01(swipeDistance * swipePowerMultiplier);
                        CurrentPower = normalizedPower;
                        OnPowerChanged?.Invoke(normalizedPower);
                    }
                    break;

                case TouchPhase.Ended:
                    if (isSwiping && CurrentPower > 0.05f)
                    {
                        FireShot();
                    }
                    isSwiping = false;
                    CurrentPower = 0;
                    break;

                case TouchPhase.Canceled:
                    isSwiping = false;
                    CurrentPower = 0;
                    break;
            }
        }

        private void FireShot()
        {
            if (ball == null) return;

            float power = Mathf.Lerp(minPower, maxPower, CurrentPower);
            float angle = Mathf.Lerp(launchAngleLow, launchAngleHigh, CurrentPower);

            ball.Hit(AimDirection, power, angle);
            CanShoot = false;
            isAiming = false;

            OnShotFired?.Invoke();
        }
    }
}
