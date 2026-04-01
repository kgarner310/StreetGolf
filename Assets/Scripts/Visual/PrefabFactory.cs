using UnityEngine;
using StreetGolf.Golf;
using StreetGolf.UI;
using TMPro;

namespace StreetGolf.Visual
{
    /// <summary>
    /// Assembles complete GameObjects at runtime from procedural meshes + materials.
    /// These are the "prefabs" — fully configured 3D objects ready for the AR scene.
    /// </summary>
    public static class PrefabFactory
    {
        /// <summary>
        /// Creates the golf ball: sphere mesh, trail renderer, GolfBall component.
        /// </summary>
        public static GameObject CreateGolfBall()
        {
            var go = new GameObject("GolfBall");

            // Mesh
            var meshChild = new GameObject("BallMesh");
            meshChild.transform.SetParent(go.transform, false);
            var mf = meshChild.AddComponent<MeshFilter>();
            mf.mesh = MeshFactory.CreateSphere(0.02f);
            var mr = meshChild.AddComponent<MeshRenderer>();
            mr.material = MaterialFactory.BallMaterial();

            // Trail
            var trail = go.AddComponent<TrailRenderer>();
            trail.material = MaterialFactory.TrailMaterial();
            trail.startWidth = 0.01f;
            trail.endWidth = 0f;
            trail.time = 0.4f;
            trail.minVertexDistance = 0.02f;

            // GolfBall component
            var ball = go.AddComponent<GolfBall>();
            ball.Initialize(meshChild, trail);

            return go;
        }

        /// <summary>
        /// Creates the hole target: green disc, hole cup, flag pole, flag cloth, pulse ring.
        /// </summary>
        public static GameObject CreateHoleFlag()
        {
            var root = new GameObject("HoleTarget");

            // Putting green disc
            var green = new GameObject("Green");
            green.transform.SetParent(root.transform, false);
            green.transform.localPosition = new Vector3(0, 0.002f, 0);
            var greenMF = green.AddComponent<MeshFilter>();
            greenMF.mesh = MeshFactory.CreateDisc(0.5f, 24);
            var greenMR = green.AddComponent<MeshRenderer>();
            greenMR.material = MaterialFactory.GreenMaterial();

            // Hole cup (dark circle at center)
            var cup = new GameObject("HoleCup");
            cup.transform.SetParent(root.transform, false);
            cup.transform.localPosition = new Vector3(0, 0.003f, 0);
            var cupMF = cup.AddComponent<MeshFilter>();
            cupMF.mesh = MeshFactory.CreateDisc(0.08f, 12);
            var cupMR = cup.AddComponent<MeshRenderer>();
            cupMR.material = MaterialFactory.HoleCupMaterial();

            // Flag pole
            var pole = new GameObject("FlagPole");
            pole.transform.SetParent(root.transform, false);
            pole.transform.localPosition = new Vector3(0, 0.5f, 0);
            var poleMF = pole.AddComponent<MeshFilter>();
            poleMF.mesh = MeshFactory.CreateCylinder(0.008f, 1f, 6);
            var poleMR = pole.AddComponent<MeshRenderer>();
            poleMR.material = MaterialFactory.FlagPoleMaterial();

            // Flag cloth
            var flag = new GameObject("FlagCloth");
            flag.transform.SetParent(root.transform, false);
            flag.transform.localPosition = new Vector3(0.01f, 0.92f, 0);
            var flagMF = flag.AddComponent<MeshFilter>();
            flagMF.mesh = MeshFactory.CreateQuad(0.18f, 0.1f);
            var flagMR = flag.AddComponent<MeshRenderer>();
            flagMR.material = MaterialFactory.FlagClothMaterial();
            flag.AddComponent<FlagFlutter>();

            // Pulse ring (visibility indicator)
            var ring = new GameObject("PulseRing");
            ring.transform.SetParent(root.transform, false);
            ring.transform.localPosition = new Vector3(0, 0.004f, 0);
            var ringMF = ring.AddComponent<MeshFilter>();
            ringMF.mesh = MeshFactory.CreateRing(0.5f, 0.6f, 24);
            var ringMR = ring.AddComponent<MeshRenderer>();
            ringMR.material = MaterialFactory.PulseRingMaterial();
            ring.AddComponent<PulseEffect>();

            // Direction line (ball → hole)
            var dirLine = root.AddComponent<LineRenderer>();
            dirLine.material = MaterialFactory.DirectionLineMaterial();
            dirLine.startWidth = 0.015f;
            dirLine.endWidth = 0.015f;
            dirLine.positionCount = 2;

            // HoleTarget component
            var holeTarget = root.AddComponent<HoleTarget>();
            holeTarget.Initialize(root, ring, dirLine);

            return root;
        }

        /// <summary>
        /// Creates the compass arrow that floats above the ball and points to the hole.
        /// </summary>
        public static GameObject CreateCompassArrow()
        {
            var root = new GameObject("CompassArrow");

            var visual = new GameObject("ArrowVisual");
            visual.transform.SetParent(root.transform, false);
            var mf = visual.AddComponent<MeshFilter>();
            mf.mesh = MeshFactory.CreateArrow(0.15f, 0.06f);
            var mr = visual.AddComponent<MeshRenderer>();
            mr.material = MaterialFactory.ArrowMaterial();

            var compass = root.AddComponent<CompassArrow>();
            compass.Initialize(visual.transform);

            return root;
        }

        /// <summary>
        /// Creates the aim indicator: trajectory line + landing marker.
        /// </summary>
        public static GameObject CreateAimIndicator()
        {
            var root = new GameObject("AimIndicator");

            // Aim line
            var aimLine = root.AddComponent<LineRenderer>();
            aimLine.material = MaterialFactory.AimLineMaterial();
            aimLine.startWidth = 0.015f;
            aimLine.endWidth = 0.008f;
            aimLine.positionCount = 2;

            // Landing marker
            var marker = new GameObject("LandingMarker");
            marker.transform.SetParent(root.transform, false);
            var markerMF = marker.AddComponent<MeshFilter>();
            markerMF.mesh = MeshFactory.CreateRing(0.08f, 0.12f, 12);
            var markerMR = marker.AddComponent<MeshRenderer>();
            markerMR.material = MaterialFactory.LandingMarkerMaterial();

            var aim = root.AddComponent<AimIndicator>();
            // Initialize will be called after ShotController and GolfBall exist

            return root;
        }

        /// <summary>
        /// Creates the distance banner: world-space text showing distance + landmark name.
        /// </summary>
        public static GameObject CreateDistanceBanner()
        {
            var root = new GameObject("DistanceBanner");

            // Distance label
            var distGO = new GameObject("DistanceLabel");
            distGO.transform.SetParent(root.transform, false);
            distGO.transform.localPosition = Vector3.zero;
            var distTMP = distGO.AddComponent<TextMeshPro>();
            distTMP.text = "0m";
            distTMP.fontSize = 4f;
            distTMP.alignment = TextAlignmentOptions.Center;
            distTMP.color = Color.white;

            // Landmark name label (above distance)
            var nameGO = new GameObject("LandmarkNameLabel");
            nameGO.transform.SetParent(root.transform, false);
            nameGO.transform.localPosition = new Vector3(0, 0.5f, 0);
            var nameTMP = nameGO.AddComponent<TextMeshPro>();
            nameTMP.text = "";
            nameTMP.fontSize = 3f;
            nameTMP.alignment = TextAlignmentOptions.Center;
            nameTMP.color = new Color(1f, 0.9f, 0.3f);
            nameTMP.fontStyle = FontStyles.Bold;

            var banner = root.AddComponent<DistanceBanner>();
            banner.Initialize(distTMP, nameTMP);

            return root;
        }
    }
}
