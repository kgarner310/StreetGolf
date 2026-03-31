using UnityEngine;
using TMPro;
using StreetGolf.Golf;

namespace StreetGolf.UI
{
    /// <summary>
    /// World-space distance banner that floats in AR space,
    /// showing how far the hole is. Visible when looking toward the hole.
    /// </summary>
    public class DistanceBanner : MonoBehaviour
    {
        [SerializeField] private TextMeshPro distanceLabel;
        [SerializeField] private float displayDistance = 50f;

        private HoleTarget hole;
        private GolfBall ball;
        private Camera mainCam;

        private void Start()
        {
            hole = HoleTarget.Instance;
            ball = GolfBall.Instance;
            mainCam = Camera.main;
        }

        private void Update()
        {
            if (hole == null || ball == null) return;

            // Position the banner at the hole
            transform.position = hole.transform.position + Vector3.up * 2f;

            // Billboard — always face the camera
            if (mainCam != null)
            {
                transform.LookAt(mainCam.transform);
                transform.Rotate(0, 180, 0);
            }

            // Update text
            float dist = hole.DistanceFromBall;
            if (distanceLabel != null)
            {
                distanceLabel.text = $"{dist:F0}m";
            }

            // Scale based on distance so it's readable
            float scale = Mathf.Clamp(dist / displayDistance, 0.5f, 3f);
            transform.localScale = Vector3.one * scale;
        }
    }
}
