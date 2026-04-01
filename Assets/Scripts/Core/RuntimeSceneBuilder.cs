using UnityEngine;
using UnityEngine.XR.ARFoundation;
using StreetGolf.AR;
using StreetGolf.Golf;
using StreetGolf.GPS;
using StreetGolf.UI;
using StreetGolf.Utils;
using StreetGolf.Visual;

namespace StreetGolf.Core
{
    /// <summary>
    /// Constructs the entire game scene at runtime.
    /// This is the single entry point — attach to an empty GameObject in the scene.
    /// Builds AR session, golf objects, UI, and wires everything together.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public class RuntimeSceneBuilder : MonoBehaviour
    {
        private void Awake()
        {
            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            Input.multiTouchEnabled = false;

            BuildScene();
        }

        private void BuildScene()
        {
            // 1. AR Foundation
            var arSession = CreateARSession();
            var (arCamera, arCamManager, planeManager, raycastManager) = CreateARCameraRig();

            // 2. AR Managers
            var surfaceManagerGO = new GameObject("ARSurfaceManager");
            var surfaceManager = surfaceManagerGO.AddComponent<ARSurfaceManager>();
            surfaceManager.Initialize(planeManager, raycastManager, arSession);

            var camControllerGO = new GameObject("ARCameraController");
            var camController = camControllerGO.AddComponent<ARCameraController>();
            camController.Initialize(arCamManager, arCamera);

            // 3. Services (persistent)
            var gpsGO = new GameObject("GPSService");
            gpsGO.AddComponent<GPSLocationService>();

            var landmarkGO = new GameObject("LandmarkService");
            landmarkGO.AddComponent<LandmarkService>();

            var soundGO = new GameObject("SoundManager");
            soundGO.AddComponent<SoundManager>();

            var scorecardGO = new GameObject("Scorecard");
            scorecardGO.AddComponent<Scorecard>();

            // 4. Golf objects (3D)
            var ballGO = PrefabFactory.CreateGolfBall();
            var ball = ballGO.GetComponent<GolfBall>();

            var holeFlagGO = PrefabFactory.CreateHoleFlag();
            var holeTarget = holeFlagGO.GetComponent<HoleTarget>();

            var compassGO = PrefabFactory.CreateCompassArrow();

            var aimGO = PrefabFactory.CreateAimIndicator();
            var aimIndicator = aimGO.GetComponent<AimIndicator>();
            var aimLine = aimGO.GetComponent<LineRenderer>();
            var landingMarker = aimGO.transform.Find("LandingMarker");

            var bannerGO = PrefabFactory.CreateDistanceBanner();

            // 5. Shot controller
            var shotGO = new GameObject("ShotController");
            var shotController = shotGO.AddComponent<ShotController>();
            shotController.Initialize(ball);

            // Wire aim indicator now that shot controller and ball exist
            aimIndicator.Initialize(aimLine, landingMarker, shotController, ball);

            // 6. Hole generator
            var holeGenGO = new GameObject("HoleGenerator");
            var holeGenerator = holeGenGO.AddComponent<HoleGenerator>();

            // 7. Game manager
            var gmGO = new GameObject("GameManager");
            var gameManager = gmGO.AddComponent<GameManager>();
            gameManager.Initialize(ball, holeTarget, shotController, holeGenerator);

            // 8. UI
            var canvas = UIFactory.CreateMainCanvas();
            UIFactory.CreateEventSystem();
            UIFactory.CreateGameHUD(canvas.transform);
            UIFactory.CreateHoleCompletePanel(canvas.transform);
            UIFactory.CreateMiniMap(canvas.transform);

            Debug.Log("StreetGolf: Scene built. All systems wired.");
        }

        private ARSession CreateARSession()
        {
            var go = new GameObject("AR Session");
            var session = go.AddComponent<ARSession>();
            return session;
        }

        private (Camera, ARCameraManager, ARPlaneManager, ARRaycastManager) CreateARCameraRig()
        {
            // XR Origin root
            var originGO = new GameObject("XR Origin");

            // Camera offset (standard AR Foundation hierarchy)
            var offsetGO = new GameObject("Camera Offset");
            offsetGO.transform.SetParent(originGO.transform, false);

            // AR Camera
            var camGO = new GameObject("AR Camera");
            camGO.transform.SetParent(offsetGO.transform, false);
            camGO.tag = "MainCamera";

            var camera = camGO.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = Color.black;
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 1000f;

            var arCamManager = camGO.AddComponent<ARCameraManager>();
            camGO.AddComponent<ARCameraBackground>();

            // Tracked pose driver for AR camera tracking
            // Note: TrackedPoseDriver is in UnityEngine.InputSystem or
            // UnityEngine.SpatialTracking depending on version
#if UNITY_2021_1_OR_NEWER
            var tpd = camGO.AddComponent<UnityEngine.InputSystem.XR.TrackedPoseDriver>();
#endif

            // Plane & raycast managers on origin
            var planeManager = originGO.AddComponent<ARPlaneManager>();
            var raycastManager = originGO.AddComponent<ARRaycastManager>();

            return (camera, arCamManager, planeManager, raycastManager);
        }
    }
}
