using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Manages all UI: start screen, game HUD, hole completion, and water penalty popup.
/// Creates all UI elements programmatically — no prefabs or scene setup needed.
/// </summary>
public class UIManager : MonoBehaviour
{
    // Panels
    private GameObject startPanel;
    private GameObject gamePanel;
    private GameObject holeCompletePanel;
    private GameObject waterPenaltyPanel;

    // Game HUD texts
    private Text strokeText;
    private Text holeInfoText;
    private Text terrainText;

    // Completion texts
    private Text scoreLabelText;
    private Text scoreDetailText;

    // Canvas reference
    private Canvas canvas;

    void Awake()
    {
        BuildUI();
    }

    // --- Public API ---

    public void ShowStartScreen()
    {
        startPanel.SetActive(true);
        gamePanel.SetActive(false);
        holeCompletePanel.SetActive(false);
        waterPenaltyPanel.SetActive(false);
    }

    public void ShowGameScreen()
    {
        startPanel.SetActive(false);
        gamePanel.SetActive(true);
        holeCompletePanel.SetActive(false);
    }

    public void UpdateStrokeCount(int strokes)
    {
        strokeText.text = strokes.ToString();
    }

    public void UpdateHoleInfo(int par, Vector2 location)
    {
        holeInfoText.text = $"PAR {par}  •  ({location.x:F2}, {location.y:F2})";
    }

    public void UpdateTerrainDisplay(string terrain)
    {
        terrainText.text = terrain.ToUpper();
    }

    public void ShowHoleComplete(int strokes, int par, string label)
    {
        holeCompletePanel.SetActive(true);
        scoreLabelText.text = label;
        scoreDetailText.text = $"{strokes} stroke{(strokes != 1 ? "s" : "")}  •  Par {par}";
    }

    public void ShowWaterPenalty()
    {
        waterPenaltyPanel.SetActive(true);
        Invoke(nameof(HideWaterPenalty), 1.8f);
    }

    void HideWaterPenalty()
    {
        waterPenaltyPanel.SetActive(false);
    }

    // --- Build entire UI programmatically ---

    void BuildUI()
    {
        // Canvas
        canvas = gameObject.GetComponent<Canvas>();
        if (canvas == null) canvas = gameObject.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 100;

        CanvasScaler scaler = gameObject.GetComponent<CanvasScaler>();
        if (scaler == null) scaler = gameObject.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1080, 1920);
        scaler.matchWidthOrHeight = 0.5f;

        if (gameObject.GetComponent<GraphicRaycaster>() == null)
            gameObject.AddComponent<GraphicRaycaster>();

        // Ensure EventSystem exists
        if (FindObjectOfType<UnityEngine.EventSystems.EventSystem>() == null)
        {
            GameObject es = new GameObject("EventSystem");
            es.AddComponent<UnityEngine.EventSystems.EventSystem>();
            es.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
        }

        BuildStartPanel();
        BuildGamePanel();
        BuildHoleCompletePanel();
        BuildWaterPenaltyPanel();
    }

    void BuildStartPanel()
    {
        startPanel = CreatePanel("StartPanel", new Color(0.08f, 0.18f, 0.08f, 0.95f));

        // Title
        CreateText(startPanel.transform, "Title", "GOLF",
            new Vector2(0, 200), 80, FontStyle.Bold, Color.white);

        // Subtitle
        CreateText(startPanel.transform, "Subtitle", "Location-Seeded Holes",
            new Vector2(0, 100), 32, FontStyle.Normal, new Color(0.7f, 0.9f, 0.7f));

        // Generate button
        CreateButton(startPanel.transform, "GenerateBtn", "GENERATE HOLE NEAR ME",
            new Vector2(0, -80), new Vector2(600, 100),
            new Color(0.25f, 0.55f, 0.20f), Color.white, 36,
            () => GameManager.Instance.GenerateHoleNearMe());

        // Instruction
        CreateText(startPanel.transform, "Hint",
            "Drag back from ball to aim & set power\nRelease to shoot",
            new Vector2(0, -250), 26, FontStyle.Italic, new Color(0.6f, 0.8f, 0.6f, 0.7f));
    }

    void BuildGamePanel()
    {
        gamePanel = CreatePanel("GamePanel", Color.clear);

        // Top bar background
        GameObject topBar = CreatePanel("TopBar", new Color(0, 0, 0, 0.5f), gamePanel.transform);
        RectTransform topBarRect = topBar.GetComponent<RectTransform>();
        topBarRect.anchorMin = new Vector2(0, 1);
        topBarRect.anchorMax = new Vector2(1, 1);
        topBarRect.pivot = new Vector2(0.5f, 1);
        topBarRect.anchoredPosition = Vector2.zero;
        topBarRect.sizeDelta = new Vector2(0, 140);

        // Stroke count (big number)
        strokeText = CreateText(topBar.transform, "StrokeCount", "0",
            new Vector2(-300, -40), 64, FontStyle.Bold, Color.white).GetComponent<Text>();

        // "STROKES" label
        CreateText(topBar.transform, "StrokesLabel", "STROKES",
            new Vector2(-300, -95), 20, FontStyle.Normal, new Color(0.7f, 0.7f, 0.7f));

        // Hole info (par + coords)
        holeInfoText = CreateText(topBar.transform, "HoleInfo", "PAR 3",
            new Vector2(100, -40), 28, FontStyle.Normal, Color.white).GetComponent<Text>();

        // Terrain indicator
        terrainText = CreateText(topBar.transform, "Terrain", "TEE BOX",
            new Vector2(100, -90), 22, FontStyle.Normal, new Color(0.6f, 1f, 0.6f)).GetComponent<Text>();

        gamePanel.SetActive(false);
    }

    void BuildHoleCompletePanel()
    {
        holeCompletePanel = CreatePanel("HoleCompletePanel", new Color(0, 0, 0, 0.8f));

        // Score label (e.g. "Birdie!", "Par")
        scoreLabelText = CreateText(holeCompletePanel.transform, "ScoreLabel", "PAR",
            new Vector2(0, 120), 72, FontStyle.Bold, new Color(1f, 0.85f, 0.3f)).GetComponent<Text>();

        // Detail (e.g. "3 strokes • Par 3")
        scoreDetailText = CreateText(holeCompletePanel.transform, "ScoreDetail", "",
            new Vector2(0, 30), 32, FontStyle.Normal, Color.white).GetComponent<Text>();

        // Play again button
        CreateButton(holeCompletePanel.transform, "PlayAgainBtn", "NEW HOLE",
            new Vector2(0, -100), new Vector2(500, 90),
            new Color(0.25f, 0.55f, 0.20f), Color.white, 34,
            () =>
            {
                holeCompletePanel.SetActive(false);
                // Clear location cache so new locations give new holes, or regenerate same
                GameManager.Instance.GenerateHoleNearMe();
            });

        // New location button
        CreateButton(holeCompletePanel.transform, "NewLocationBtn", "TRY DIFFERENT COORDS",
            new Vector2(0, -220), new Vector2(500, 70),
            new Color(0.3f, 0.3f, 0.3f), new Color(0.8f, 0.8f, 0.8f), 26,
            () =>
            {
                // Shift coordinates slightly for a new hole
                Vector2 loc = LocationProvider.GetLocation();
                LocationProvider.SetManualLocation(loc.x + 0.001f, loc.y + 0.001f);
                holeCompletePanel.SetActive(false);
                GameManager.Instance.GenerateHoleNearMe();
            });

        holeCompletePanel.SetActive(false);
    }

    void BuildWaterPenaltyPanel()
    {
        waterPenaltyPanel = new GameObject("WaterPenaltyPanel");
        waterPenaltyPanel.transform.SetParent(transform, false);
        RectTransform rt = waterPenaltyPanel.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0.1f, 0.4f);
        rt.anchorMax = new Vector2(0.9f, 0.6f);
        rt.offsetMin = Vector2.zero;
        rt.offsetMax = Vector2.zero;

        Image bg = waterPenaltyPanel.AddComponent<Image>();
        bg.color = new Color(0.15f, 0.3f, 0.6f, 0.9f);

        CreateText(waterPenaltyPanel.transform, "WaterText", "WATER HAZARD\n+1 Penalty Stroke",
            Vector2.zero, 36, FontStyle.Bold, Color.white);

        waterPenaltyPanel.SetActive(false);
    }

    // --- UI factory helpers ---

    GameObject CreatePanel(string name, Color bgColor, Transform parent = null)
    {
        if (parent == null) parent = transform;

        GameObject panel = new GameObject(name);
        panel.transform.SetParent(parent, false);
        RectTransform rt = panel.AddComponent<RectTransform>();
        rt.anchorMin = Vector2.zero;
        rt.anchorMax = Vector2.one;
        rt.offsetMin = Vector2.zero;
        rt.offsetMax = Vector2.zero;

        if (bgColor.a > 0)
        {
            Image img = panel.AddComponent<Image>();
            img.color = bgColor;
        }

        return panel;
    }

    GameObject CreateText(Transform parent, string name, string content,
        Vector2 position, int fontSize, FontStyle style, Color color)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(parent, false);

        RectTransform rt = obj.AddComponent<RectTransform>();
        rt.anchoredPosition = position;
        rt.sizeDelta = new Vector2(800, fontSize + 40);

        Text text = obj.AddComponent<Text>();
        text.text = content;
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        if (text.font == null) text.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
        text.fontSize = fontSize;
        text.fontStyle = style;
        text.color = color;
        text.alignment = TextAnchor.MiddleCenter;
        text.horizontalOverflow = HorizontalWrapMode.Overflow;
        text.verticalOverflow = VerticalWrapMode.Overflow;

        return obj;
    }

    void CreateButton(Transform parent, string name, string label,
        Vector2 position, Vector2 size, Color bgColor, Color textColor,
        int fontSize, UnityEngine.Events.UnityAction onClick)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(parent, false);

        RectTransform rt = obj.AddComponent<RectTransform>();
        rt.anchoredPosition = position;
        rt.sizeDelta = size;

        Image img = obj.AddComponent<Image>();
        img.color = bgColor;

        Button btn = obj.AddComponent<Button>();
        btn.targetGraphic = img;

        // Button color tint
        ColorBlock colors = btn.colors;
        colors.normalColor = Color.white;
        colors.highlightedColor = new Color(0.9f, 0.9f, 0.9f);
        colors.pressedColor = new Color(0.7f, 0.7f, 0.7f);
        btn.colors = colors;

        btn.onClick.AddListener(onClick);

        // Label
        GameObject labelObj = new GameObject("Label");
        labelObj.transform.SetParent(obj.transform, false);
        RectTransform labelRT = labelObj.AddComponent<RectTransform>();
        labelRT.anchorMin = Vector2.zero;
        labelRT.anchorMax = Vector2.one;
        labelRT.offsetMin = Vector2.zero;
        labelRT.offsetMax = Vector2.zero;

        Text text = labelObj.AddComponent<Text>();
        text.text = label;
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        if (text.font == null) text.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
        text.fontSize = fontSize;
        text.fontStyle = FontStyle.Bold;
        text.color = textColor;
        text.alignment = TextAnchor.MiddleCenter;
    }
}
