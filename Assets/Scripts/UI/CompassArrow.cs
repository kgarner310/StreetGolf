using UnityEngine;
using StreetGolf.Golf;

namespace StreetGolf.UI
{
    /// <summary>
    /// An AR compass arrow that always points toward the hole.
    /// Floats above the ball so the player knows which direction to aim.
    /// </summary>
    public class CompassArrow : MonoBehaviour
    {
        [SerializeField] private Transform arrowVisual;
        [SerializeField] private float floatHeight = 0.5f;
        [SerializeField] private float bobSpeed = 2f;
        [SerializeField] private float bobAmount = 0.05f;

        private GolfBall ball;
        private HoleTarget hole;

        private void Start()
        {
            ball = GolfBall.Instance;
            hole = HoleTarget.Instance;
        }

        private void Update()
        {
            if (ball == null || hole == null) return;

            // Position above the ball
            float bob = Mathf.Sin(Time.time * bobSpeed) * bobAmount;
            transform.position = ball.Position + Vector3.up * (floatHeight + bob);

            // Point toward the hole
            Vector3 toHole = hole.transform.position - ball.Position;
            toHole.y = 0;

            if (toHole.sqrMagnitude > 0.01f)
            {
                Quaternion targetRot = Quaternion.LookRotation(toHole);
                transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, Time.deltaTime * 5f);
            }
        }
    }
}
