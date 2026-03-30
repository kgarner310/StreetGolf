using UnityEngine;
using UnityEngine.UI;
using TMPro;
using StreetGolf.Core;

namespace StreetGolf.UI
{
    /// <summary>
    /// Shows the scorecard when a hole is completed.
    /// Displays strokes, par comparison, score name, and next hole button.
    /// </summary>
    public class HoleCompletePanel : MonoBehaviour
    {
        [Header("UI Elements")]
        [SerializeField] private GameObject panel;
        [SerializeField] private TextMeshProUGUI scoreNameText;
        [SerializeField] private TextMeshProUGUI strokesText;
        [SerializeField] private TextMeshProUGUI parCompareText;
        [SerializeField] private TextMeshProUGUI totalStrokesText;
        [SerializeField] private TextMeshProUGUI distanceText;
        [SerializeField] private Button nextHoleButton;
        [SerializeField] private Button shareButton;

        [Header("Score Name Colors")]
        [SerializeField] private Color eagleColor = new Color(1f, 0.84f, 0f);
        [SerializeField] private Color birdieColor = new Color(0.2f, 0.9f, 0.3f);
        [SerializeField] private Color parColor = Color.white;
        [SerializeField] private Color bogeyColor = new Color(1f, 0.5f, 0.2f);

        private void Start()
        {
            if (panel != null)
                panel.SetActive(false);

            if (GameManager.Instance != null)
                GameManager.Instance.OnHoleCompleted += ShowResult;

            if (nextHoleButton != null)
                nextHoleButton.onClick.AddListener(OnNextHole);
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnHoleCompleted -= ShowResult;
        }

        private void ShowResult(HoleResult result)
        {
            if (panel != null)
                panel.SetActive(true);

            if (scoreNameText != null)
            {
                scoreNameText.text = result.ScoreName;
                scoreNameText.color = GetScoreColor(result.Strokes - result.Par);
            }

            if (strokesText != null)
                strokesText.text = result.Strokes.ToString();

            if (parCompareText != null)
            {
                int diff = result.Strokes - result.Par;
                parCompareText.text = diff switch
                {
                    0 => "Even",
                    > 0 => $"+{diff}",
                    _ => diff.ToString()
                };
            }

            if (totalStrokesText != null)
                totalStrokesText.text = $"Total: {GameManager.Instance.TotalStrokes}";

            if (distanceText != null)
                distanceText.text = $"{result.DistanceMeters:F0}m hole";
        }

        private Color GetScoreColor(int relativeToPar)
        {
            if (relativeToPar <= -2) return eagleColor;
            if (relativeToPar == -1) return birdieColor;
            if (relativeToPar == 0) return parColor;
            return bogeyColor;
        }

        private void OnNextHole()
        {
            if (panel != null)
                panel.SetActive(false);

            GameManager.Instance.StartNewHole();
        }
    }
}
