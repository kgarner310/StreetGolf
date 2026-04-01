using UnityEngine;
using StreetGolf.AR;

namespace StreetGolf.Golf
{
    /// <summary>
    /// Visual aim indicator shown on the ground in AR.
    /// Shows the player where their shot will go based on phone orientation.
    /// Includes a projected landing zone based on current power.
    /// </summary>
    public class AimIndicator : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private LineRenderer aimLine;
        [SerializeField] private Transform landingMarker;
        [SerializeField] private ShotController shotController;
        [SerializeField] private GolfBall ball;

        [Header("Settings")]
        [SerializeField] private float lineLength = 3f;
        [SerializeField] private int lineSegments = 20;
        [SerializeField] private float maxTrajectoryTime = 3f;
        [SerializeField] private Color aimColor = new Color(1f, 1f, 1f, 0.5f);
        [SerializeField] private Color powerColor = new Color(1f, 0.3f, 0.1f, 0.8f);

        private bool isActive;

        public void Initialize(LineRenderer line, Transform marker, ShotController shot, GolfBall golfBall)
        {
            aimLine = line;
            landingMarker = marker;
            shotController = shot;
            ball = golfBall;
        }

        public void Show()
        {
            isActive = true;
            if (aimLine != null) aimLine.enabled = true;
            if (landingMarker != null) landingMarker.gameObject.SetActive(true);
        }

        public void Hide()
        {
            isActive = false;
            if (aimLine != null) aimLine.enabled = false;
            if (landingMarker != null) landingMarker.gameObject.SetActive(false);
        }

        private void Update()
        {
            if (!isActive || ball == null || shotController == null) return;
            if (!shotController.CanShoot) { Hide(); return; }

            Vector3 origin = ball.Position;
            Vector3 direction = shotController.AimDirection;
            float power = shotController.CurrentPower;

            if (power < 0.05f)
            {
                DrawSimpleAimLine(origin, direction);
            }
            else
            {
                DrawTrajectory(origin, direction, power);
            }
        }

        private void DrawSimpleAimLine(Vector3 origin, Vector3 direction)
        {
            if (aimLine == null) return;

            aimLine.positionCount = 2;
            aimLine.startColor = aimColor;
            aimLine.endColor = aimColor;
            aimLine.SetPosition(0, origin + Vector3.up * 0.05f);
            aimLine.SetPosition(1, origin + direction * lineLength + Vector3.up * 0.05f);

            if (landingMarker != null)
                landingMarker.gameObject.SetActive(false);
        }

        private void DrawTrajectory(Vector3 origin, Vector3 direction, float normalizedPower)
        {
            if (aimLine == null) return;

            float power = Mathf.Lerp(2f, 25f, normalizedPower);
            float angle = Mathf.Lerp(15f, 45f, normalizedPower);
            float rad = angle * Mathf.Deg2Rad;

            Vector3 launchVel = (direction * Mathf.Cos(rad) + Vector3.up * Mathf.Sin(rad)).normalized * power;

            aimLine.positionCount = lineSegments;
            aimLine.startColor = Color.Lerp(aimColor, powerColor, normalizedPower);
            aimLine.endColor = Color.Lerp(aimColor, powerColor, normalizedPower);

            float dt = maxTrajectoryTime / lineSegments;
            Vector3 pos = origin;
            Vector3 vel = launchVel;
            Vector3 landingPos = origin;

            for (int i = 0; i < lineSegments; i++)
            {
                aimLine.SetPosition(i, pos + Vector3.up * 0.05f);

                vel += Vector3.up * -9.81f * dt;
                pos += vel * dt;

                if (pos.y <= origin.y && i > 0)
                {
                    landingPos = pos;
                    landingPos.y = origin.y;
                    // Fill remaining points at landing
                    for (int j = i + 1; j < lineSegments; j++)
                        aimLine.SetPosition(j, landingPos + Vector3.up * 0.05f);
                    break;
                }

                landingPos = pos;
            }

            if (landingMarker != null)
            {
                landingMarker.gameObject.SetActive(true);
                landingMarker.position = landingPos;
            }
        }
    }
}
