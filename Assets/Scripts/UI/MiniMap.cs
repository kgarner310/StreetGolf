using UnityEngine;
using UnityEngine.UI;
using StreetGolf.Golf;
using StreetGolf.GPS;

namespace StreetGolf.UI
{
    /// <summary>
    /// Top-down minimap showing the ball and hole positions relative to each other.
    /// Gives the player a bird's-eye view of the hole layout.
    /// </summary>
    public class MiniMap : MonoBehaviour
    {
        [Header("UI")]
        [SerializeField] private RectTransform mapContainer;
        [SerializeField] private RectTransform ballIcon;
        [SerializeField] private RectTransform holeIcon;
        [SerializeField] private RectTransform playerIcon;

        [Header("Settings")]
        [SerializeField] private float mapScale = 2f; // pixels per meter

        private GolfBall ball;
        private HoleTarget hole;

        private void Start()
        {
            ball = GolfBall.Instance;
            hole = HoleTarget.Instance;
        }

        private void Update()
        {
            if (ball == null || hole == null || mapContainer == null) return;

            // Center the map on the midpoint between ball and hole
            Vector3 ballPos = ball.Position;
            Vector3 holePos = hole.transform.position;
            Vector3 center = (ballPos + holePos) * 0.5f;

            // Calculate dynamic scale to fit both in view
            float dist = Vector3.Distance(
                new Vector3(ballPos.x, 0, ballPos.z),
                new Vector3(holePos.x, 0, holePos.z));

            float halfSize = mapContainer.rect.width * 0.4f;
            float dynamicScale = (dist > 0.1f) ? halfSize / (dist * 0.5f) : mapScale;

            // Update ball icon
            if (ballIcon != null)
            {
                Vector2 ballOffset = WorldToMapPosition(ballPos, center, dynamicScale);
                ballIcon.anchoredPosition = ballOffset;
            }

            // Update hole icon
            if (holeIcon != null)
            {
                Vector2 holeOffset = WorldToMapPosition(holePos, center, dynamicScale);
                holeIcon.anchoredPosition = holeOffset;
            }

            // Update player icon (current GPS position)
            if (playerIcon != null && GPSLocationService.Instance != null)
            {
                Vector3 playerWorldPos = GPSLocationService.Instance.GPSToWorldPosition(
                    GPSLocationService.Instance.CurrentPosition);
                Vector2 playerOffset = WorldToMapPosition(playerWorldPos, center, dynamicScale);
                playerIcon.anchoredPosition = playerOffset;
            }
        }

        private Vector2 WorldToMapPosition(Vector3 worldPos, Vector3 center, float scale)
        {
            float x = (worldPos.x - center.x) * scale;
            float y = (worldPos.z - center.z) * scale;
            return new Vector2(x, y);
        }
    }
}
