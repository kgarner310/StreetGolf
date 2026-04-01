using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

namespace StreetGolf.AR
{
    /// <summary>
    /// Manages AR plane detection for placing the golf ball on real-world surfaces.
    /// Detects ground planes so the ball can be placed on sidewalks, streets, grass, etc.
    /// </summary>
    public class ARSurfaceManager : MonoBehaviour
    {
        public static ARSurfaceManager Instance { get; private set; }

        public event Action<ARPlane> OnGroundPlaneDetected;
        public event Action<Pose> OnSurfaceTapped;

        [SerializeField] private ARPlaneManager planeManager;
        [SerializeField] private ARRaycastManager raycastManager;
        [SerializeField] private ARSession arSession;

        public bool HasDetectedGround { get; private set; }
        public ARPlane PrimaryGroundPlane { get; private set; }

        private List<ARRaycastHit> raycastHits = new List<ARRaycastHit>();

        public void Initialize(ARPlaneManager planes, ARRaycastManager raycasts, ARSession session)
        {
            planeManager = planes;
            raycastManager = raycasts;
            arSession = session;
        }

        private void Awake()
        {
            if (Instance != null)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        private void OnEnable()
        {
            if (planeManager != null)
                planeManager.planesChanged += OnPlanesChanged;
        }

        private void OnDisable()
        {
            if (planeManager != null)
                planeManager.planesChanged -= OnPlanesChanged;
        }

        private void Update()
        {
            if (Input.touchCount > 0)
            {
                Touch touch = Input.GetTouch(0);
                if (touch.phase == TouchPhase.Began)
                {
                    TryRaycastFromScreen(touch.position);
                }
            }
        }

        private void OnPlanesChanged(ARPlanesChangedEventArgs args)
        {
            foreach (var plane in args.added)
            {
                if (IsGroundPlane(plane))
                {
                    if (PrimaryGroundPlane == null ||
                        plane.size.x * plane.size.y > PrimaryGroundPlane.size.x * PrimaryGroundPlane.size.y)
                    {
                        PrimaryGroundPlane = plane;
                        HasDetectedGround = true;
                        OnGroundPlaneDetected?.Invoke(plane);
                    }
                }
            }
        }

        private bool IsGroundPlane(ARPlane plane)
        {
            return plane.alignment == PlaneAlignment.HorizontalUp;
        }

        /// <summary>
        /// Raycast from a screen point to find AR surfaces.
        /// </summary>
        public bool TryRaycastFromScreen(Vector2 screenPoint)
        {
            if (raycastManager == null) return false;

            if (raycastManager.Raycast(screenPoint, raycastHits, TrackableType.PlaneWithinPolygon))
            {
                Pose hitPose = raycastHits[0].pose;
                OnSurfaceTapped?.Invoke(hitPose);
                return true;
            }

            return false;
        }

        /// <summary>
        /// Raycast from camera center to find the ground directly ahead.
        /// </summary>
        public bool TryGetGroundAhead(out Pose groundPose)
        {
            Vector2 screenCenter = new Vector2(Screen.width * 0.5f, Screen.height * 0.6f);
            groundPose = Pose.identity;

            if (raycastManager != null &&
                raycastManager.Raycast(screenCenter, raycastHits, TrackableType.PlaneWithinPolygon))
            {
                groundPose = raycastHits[0].pose;
                return true;
            }

            return false;
        }

        /// <summary>
        /// Toggle plane visualization on/off (hide planes after ball is placed).
        /// </summary>
        public void SetPlanesVisible(bool visible)
        {
            if (planeManager == null) return;

            foreach (var plane in planeManager.trackables)
            {
                plane.gameObject.SetActive(visible);
            }
        }
    }
}
