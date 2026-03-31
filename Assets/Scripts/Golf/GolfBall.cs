using System;
using UnityEngine;

namespace StreetGolf.Golf
{
    /// <summary>
    /// The golf ball. Handles physics, rolling, bouncing off real-world surfaces,
    /// and tracking state (at rest, in flight, in hole).
    /// </summary>
    public class GolfBall : MonoBehaviour
    {
        public static GolfBall Instance { get; private set; }

        public event Action OnBallResting;
        public event Action OnBallHit;
        public event Action OnBallInHole;

        [Header("Physics")]
        [SerializeField] private float groundFriction = 0.6f;
        [SerializeField] private float bounciness = 0.4f;
        [SerializeField] private float minVelocityThreshold = 0.05f;
        [SerializeField] private float maxSpeed = 30f;
        [SerializeField] private float gravity = -9.81f;

        [Header("Visual")]
        [SerializeField] private TrailRenderer trail;
        [SerializeField] private GameObject ballMesh;

        public BallState State { get; private set; } = BallState.Placed;
        public Vector3 Position => transform.position;
        public Vector3 Velocity { get; private set; }
        public int ShotCount { get; private set; }
        public float DistanceTraveled { get; private set; }

        private Vector3 lastPosition;
        private float groundY;
        private bool usePhysicsSimulation = true;

        public enum BallState
        {
            Placed,     // Ball placed on ground, ready to hit
            InFlight,   // Ball is moving through the air
            Rolling,    // Ball is rolling on the ground
            Resting,    // Ball has stopped
            InHole      // Ball reached the target
        }

        private void Awake()
        {
            Instance = this;
        }

        public void PlaceAt(Vector3 position)
        {
            transform.position = position;
            groundY = position.y;
            lastPosition = position;
            Velocity = Vector3.zero;
            State = BallState.Placed;
            DistanceTraveled = 0;
            if (trail != null) trail.Clear();
        }

        /// <summary>
        /// Hit the ball with a given force direction and power.
        /// Direction comes from where the player is aiming their phone.
        /// </summary>
        public void Hit(Vector3 direction, float power, float launchAngle = 25f)
        {
            if (State == BallState.InFlight || State == BallState.Rolling)
                return;

            // Calculate launch velocity from aim direction + angle
            Vector3 flatDir = new Vector3(direction.x, 0, direction.z).normalized;
            float rad = launchAngle * Mathf.Deg2Rad;
            Vector3 launchDir = (flatDir * Mathf.Cos(rad) + Vector3.up * Mathf.Sin(rad)).normalized;

            Velocity = launchDir * power;
            State = BallState.InFlight;
            ShotCount++;
            lastPosition = transform.position;

            OnBallHit?.Invoke();
        }

        private void FixedUpdate()
        {
            if (!usePhysicsSimulation) return;
            if (State != BallState.InFlight && State != BallState.Rolling) return;

            float dt = Time.fixedDeltaTime;

            // Gravity
            if (State == BallState.InFlight)
            {
                Velocity += Vector3.up * gravity * dt;
            }

            // Air resistance (light)
            Velocity *= (1f - 0.01f * dt);

            // Clamp speed
            if (Velocity.magnitude > maxSpeed)
                Velocity = Velocity.normalized * maxSpeed;

            // Move
            Vector3 newPos = transform.position + Velocity * dt;

            // Ground collision
            if (newPos.y <= groundY)
            {
                newPos.y = groundY;

                if (State == BallState.InFlight)
                {
                    // Bounce
                    float impactSpeed = Mathf.Abs(Velocity.y);
                    Velocity = new Vector3(Velocity.x * 0.8f, impactSpeed * bounciness, Velocity.z * 0.8f);

                    if (impactSpeed < 0.5f)
                    {
                        Velocity = new Vector3(Velocity.x, 0, Velocity.z);
                        State = BallState.Rolling;
                    }
                }
            }

            // Ground friction when rolling
            if (State == BallState.Rolling)
            {
                Velocity *= (1f - groundFriction * dt);
                Velocity = new Vector3(Velocity.x, 0, Velocity.z);
            }

            // Track distance
            DistanceTraveled += Vector3.Distance(transform.position, newPos);
            transform.position = newPos;

            // Check if at rest
            if ((State == BallState.Rolling || State == BallState.InFlight) &&
                Velocity.magnitude < minVelocityThreshold)
            {
                Velocity = Vector3.zero;
                State = BallState.Resting;
                OnBallResting?.Invoke();
            }
        }

        public void SinkInHole()
        {
            State = BallState.InHole;
            Velocity = Vector3.zero;
            OnBallInHole?.Invoke();
        }

        public void ResetShots()
        {
            ShotCount = 0;
        }
    }
}
