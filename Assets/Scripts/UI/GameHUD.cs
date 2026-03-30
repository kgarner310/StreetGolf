using UnityEngine;
using UnityEngine.UI;
using TMPro;
using StreetGolf.Core;
using StreetGolf.Golf;

namespace StreetGolf.UI
{
    /// <summary>
    /// Main gameplay HUD overlay on the AR camera view.
    /// Shows distance to hole, stroke count, power meter, and hole info.
    /// Designed for one-handed mobile play.
    /// </summary>
    public class GameHUD : MonoBehaviour
    {
        [Header("Top Bar")]
        [SerializeField] private TextMeshProUGUI holeNumberText;
        [SerializeField] private TextMeshProUGUI holeNameText;
        [SerializeField] private TextMeshProUGUI parText;

        [Header("Center")]
        [SerializeField] private TextMeshProUGUI distanceText;
        [SerializeField] private TextMeshProUGUI statusText;
        [SerializeField] private GameObject aimReticle;

        [Header("Bottom")]
        [SerializeField] private TextMeshProUGUI strokeCountText;
        [SerializeField] private Slider powerMeter;
        [SerializeField] private Image powerFill;
        [SerializeField] private TextMeshProUGUI powerPercentText;

        [Header("Colors")]
        [SerializeField] private Color lowPowerColor = new Color(0.2f, 0.8f, 0.2f);
        [SerializeField] private Color highPowerColor = new Color(1f, 0.2f, 0.1f);

        private GolfBall ball;
        private HoleTarget hole;
        private ShotController shotController;
        private GameManager gameManager;

        private void Start()
        {
            gameManager = GameManager.Instance;
            ball = GolfBall.Instance;
            hole = HoleTarget.Instance;
            shotController = ShotController.Instance;

            if (gameManager != null)
            {
                gameManager.OnStateChanged += OnGameStateChanged;
                gameManager.OnHoleStarted += OnHoleStarted;
            }

            if (shotController != null)
            {
                shotController.OnPowerChanged += OnPowerChanged;
            }

            SetPowerMeterVisible(false);
        }

        private void OnDestroy()
        {
            if (gameManager != null)
            {
                gameManager.OnStateChanged -= OnGameStateChanged;
                gameManager.OnHoleStarted -= OnHoleStarted;
            }
            if (shotController != null)
            {
                shotController.OnPowerChanged -= OnPowerChanged;
            }
        }

        private void Update()
        {
            UpdateDistance();
            UpdateStrokeCount();
        }

        private void OnHoleStarted(int holeNumber)
        {
            if (holeNumberText != null)
                holeNumberText.text = $"HOLE {holeNumber}";

            if (parText != null && hole != null)
                parText.text = $"PAR {hole.Par}";
        }

        private void OnGameStateChanged(GameState state)
        {
            switch (state)
            {
                case GameState.Initializing:
                    SetStatus("Finding your location...");
                    break;

                case GameState.DetectingSurface:
                    SetStatus("Point your phone at the ground");
                    break;

                case GameState.PlacingBall:
                    SetStatus("Placing ball...");
                    break;

                case GameState.Aiming:
                    SetStatus("Aim your phone & swipe to hit");
                    SetPowerMeterVisible(true);
                    if (aimReticle != null) aimReticle.SetActive(true);
                    break;

                case GameState.BallInFlight:
                    SetStatus("");
                    SetPowerMeterVisible(false);
                    if (aimReticle != null) aimReticle.SetActive(false);
                    break;

                case GameState.BallSettling:
                    SetStatus("");
                    break;

                case GameState.HoleComplete:
                    SetPowerMeterVisible(false);
                    if (aimReticle != null) aimReticle.SetActive(false);
                    break;
            }
        }

        private void UpdateDistance()
        {
            if (distanceText == null || hole == null) return;

            float dist = hole.DistanceFromBall;
            if (dist > 0)
            {
                if (dist >= 1000)
                    distanceText.text = $"{dist / 1000f:F1} km";
                else
                    distanceText.text = $"{dist:F0} m";
            }
        }

        private void UpdateStrokeCount()
        {
            if (strokeCountText == null || ball == null) return;
            strokeCountText.text = $"Strokes: {ball.ShotCount}";
        }

        private void OnPowerChanged(float normalizedPower)
        {
            if (powerMeter != null)
                powerMeter.value = normalizedPower;

            if (powerFill != null)
                powerFill.color = Color.Lerp(lowPowerColor, highPowerColor, normalizedPower);

            if (powerPercentText != null)
                powerPercentText.text = $"{Mathf.RoundToInt(normalizedPower * 100)}%";
        }

        private void SetStatus(string text)
        {
            if (statusText != null)
                statusText.text = text;
        }

        private void SetPowerMeterVisible(bool visible)
        {
            if (powerMeter != null)
                powerMeter.gameObject.SetActive(visible);
            if (powerPercentText != null)
                powerPercentText.gameObject.SetActive(visible);
        }
    }
}
