using UnityEngine;

namespace StreetGolf.Visual
{
    /// <summary>
    /// Pulses scale on a GameObject to draw attention.
    /// Used on the hole indicator ring — pulses faster when ball is closer.
    /// </summary>
    public class PulseEffect : MonoBehaviour
    {
        [SerializeField] private float baseSpeed = 2f;
        [SerializeField] private float baseAmount = 0.1f;
        [SerializeField] private float closeRangeMultiplier = 3f;
        [SerializeField] private float closeRangeDistance = 5f;

        private Vector3 baseScale;

        /// <summary>
        /// Set by external code (e.g., HoleTarget) each frame.
        /// </summary>
        public float CurrentDistance { get; set; } = 100f;

        private void Start()
        {
            baseScale = transform.localScale;
        }

        private void Update()
        {
            float proximity = Mathf.Clamp01(1f - CurrentDistance / closeRangeDistance);
            float speed = baseSpeed + proximity * closeRangeMultiplier;
            float amount = baseAmount + proximity * baseAmount;

            float pulse = 1f + Mathf.Sin(Time.time * speed) * amount;
            transform.localScale = baseScale * pulse;
        }
    }
}
