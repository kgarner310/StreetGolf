using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Manages all UI elements: start screen, in-game HUD, and hole completion overlay.
/// Attach to a Canvas GameObject with the UI elements as children.
/// </summary>
public class UIManager : MonoBehaviour
{
    [Header("Panels")]
    public GameObject startPanel;
    public GameObject gamePanel;
    public GameObject holeCompletePanel;
    public GameObject waterPenaltyPanel;

    [Header("Start Screen")]
    public Button generateButton;

    [Header("Game HUD")]
    public Text strokeCountText;
    public Text holeInfoText;
    public Text terrainText;

    [Header("Hole Complete")]
    public Text scoreText;
    public Text scoreLabelText;
    public Button playAgainButton;

    void Start()
    {
        // Wire up buttons
        if (generateButton != null)
            generateButton.onClick.AddListener(OnGenerateClicked);

        if (playAgainButton != null)
            playAgainButton.onClick.AddListener(OnPlayAgainClicked);
    }

    public void ShowStartScreen()
    {
        SetPanel(startPanel, true);
        SetPanel(gamePanel, false);
        SetPanel(holeCompletePanel, false);
        SetPanel(waterPenaltyPanel, false);
    }

    public void ShowGameScreen()
    {
        SetPanel(startPanel, false);
        SetPanel(gamePanel, true);
        SetPanel(holeCompletePanel, false);
    }

    public void UpdateStrokeCount(int strokes)
    {
        if (strokeCountText != null)
            strokeCountText.text = $"Strokes: {strokes}";
    }

    public void UpdateHoleInfo(int par, Vector2 location)
    {
        if (holeInfoText != null)
            holeInfoText.text = $"Par {par}  |  {location.x:F2}, {location.y:F2}";
    }

    public void UpdateTerrainDisplay(string terrain)
    {
        if (terrainText != null)
            terrainText.text = terrain;
    }

    public void ShowHoleComplete(int strokes, int par, string label)
    {
        SetPanel(holeCompletePanel, true);

        if (scoreText != null)
            scoreText.text = $"{strokes} strokes (Par {par})";

        if (scoreLabelText != null)
            scoreLabelText.text = label;
    }

    public void ShowWaterPenalty()
    {
        if (waterPenaltyPanel != null)
        {
            SetPanel(waterPenaltyPanel, true);
            // Auto-hide after 1.5 seconds
            Invoke(nameof(HideWaterPenalty), 1.5f);
        }
    }

    void HideWaterPenalty()
    {
        SetPanel(waterPenaltyPanel, false);
    }

    void OnGenerateClicked()
    {
        GameManager.Instance.GenerateHoleNearMe();
    }

    void OnPlayAgainClicked()
    {
        SetPanel(holeCompletePanel, false);
        GameManager.Instance.GenerateHoleNearMe();
    }

    void SetPanel(GameObject panel, bool active)
    {
        if (panel != null)
            panel.SetActive(active);
    }
}
