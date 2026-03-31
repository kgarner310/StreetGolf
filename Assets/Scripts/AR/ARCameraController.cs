using UnityEngine;
using UnityEngine.XR.ARFoundation;

namespace StreetGolf.AR
{
    /// <summary>
    /// Controls the AR camera behavior during gameplay.
    /// Switches between AR passthrough (aiming) and a follow mode (watching the shot).
    /// </summary>
    public class ARCameraController : MonoBehaviour
    {
        public static ARCameraController Instance { get; private set; }

        [SerializeField] private ARCameraManager arCameraManager;
        [SerializeField] private Camera arCamera;

        [Header("Shot Follow Settings")]
        [SerializeField] private float followSmoothSpeed = 5f;
        [SerializeField] private float followHeight = 3f;
        [SerializeField] private float followDistance = 5f;

        public Camera MainCamera => arCamera;
        public CameraMode CurrentMode { get; private set; } = CameraMode.AR;

        private Transform followTarget;
        private Vector3 followVelocity;

        public enum CameraMode
        {
            AR,         // Normal AR passthrough — player aims by pointing phone
            FollowBall  // Track the ball after a shot
        }

        private void Awake()
        {
            if (Instance != null)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            if (arCamera == null)
                arCamera = Camera.main;
        }

        public void SetMode(CameraMode mode, Transform target = null)
        {
            CurrentMode = mode;
            followTarget = target;
        }

        private void LateUpdate()
        {
            if (CurrentMode == CameraMode.FollowBall && followTarget != null)
            {
                // Smooth follow behind and above the ball
                Vector3 targetPos = followTarget.position
                    - followTarget.forward * followDistance
                    + Vector3.up * followHeight;

                transform.position = Vector3.SmoothDamp(
                    transform.position, targetPos, ref followVelocity, 1f / followSmoothSpeed);

                transform.LookAt(followTarget.position);
            }
        }

        /// <summary>
        /// Get the forward direction the player is aiming (based on phone orientation).
        /// </summary>
        public Vector3 GetAimDirection()
        {
            Vector3 forward = arCamera.transform.forward;
            forward.y = 0;
            return forward.normalized;
        }

        /// <summary>
        /// Get the world position the camera is looking at on the ground plane.
        /// </summary>
        public bool TryGetLookAtGround(out Vector3 groundPoint)
        {
            Ray ray = new Ray(arCamera.transform.position, arCamera.transform.forward);
            Plane ground = new Plane(Vector3.up, Vector3.zero);

            if (ground.Raycast(ray, out float distance))
            {
                groundPoint = ray.GetPoint(distance);
                return true;
            }

            groundPoint = Vector3.zero;
            return false;
        }
    }
}
