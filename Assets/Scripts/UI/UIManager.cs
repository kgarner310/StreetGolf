using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Manages all UI: start screen, loading screen, game HUD with biome info,
/// hole completion, and water penalty popup.
/// All built programmatically — no prefabs needed.
/// </summary>
public class UIManager : MonoBehaviour
{
    // Panels
    private GameObject startPanel;
    private GameObject loadingPanel;
    private GameObject gamePanel;
    private GameObject holeCompletePanel;
    private GameObject waterPenaltyPanel;

    // Game HUD
    private Text strokeText;
    private Text holeInfoText;
    private Text terrainText;
    private Text biomeText;
    private Text holeNameText;

    // Loading
    private Text loadingText;
    private Text loadingDetailText;

    // Completion
    private Text scoreLabelText;
    private Text scoreDetailText;
    private Text holeSummaryText;

    private Canvas canvas;

    void Awake()
    {
        BuildUI();
    }

    // --- Public API ---

    public void ShowStartScreen()
    {
        SetAllPanels(false);
        startPanel.SetActive(true);
    }

    public void ShowLoadingScreen(Vector2 location)
    {
        SetAllPanels(false);
        loadingPanel.SetActive(true);
        loadingText.text = "SCANNING SURROUNDINGS...";
        loadingDetailText.text = $"({location.x:F4}, {location.y:F4})\nQuerying OpenStreetMap";
    }

    public void ShowGameScreen()
    {
        SetAllPanels(false);
        gamePanel.SetActive(true);
    }

    public void UpdateStrokeCount(int strokes)
    {
        strokeText.text = strokes.ToString();
    }

    public void UpdateHoleInfo(int par, Vector2 location, LocationProfile profile)
    {
        holeInfoText.text = $"PAR {par}  •  ({location.x:F2}, {location.y:F2})";

        string biomeName = profile.biome.ToString().ToUpper();
        biomeText.text = biomeName;
        biomeText.color = GetBiomeColor(profile.biome);

        holeNameText.text = profile.holeName ?? "";
    }

    public void UpdateTerrainDisplay(string terrain)
    {
        terrainText.text = terrain.ToUpper();
    }

    public void ShowHoleComplete(int strokes, int par, string label, LocationProfile profile)
    {
        holeCompletePanel.SetActive(true);
        scoreLabelText.text = label;
        scoreDetailText.text = $"{strokes} stroke{(strokes != 1 ? "s" : "")}  •  Par {par}";

        string biome = profile != null ? profile.biome.ToString() : "Unknown";
        string name = profile != null ? profile.holeName : "";
        holeSummaryText.text = $"{name}\n{biome} Course";
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

    void SetAllPanels(bool active)
    {
        startPanel.SetActive(active);
        loadingPanel.SetActive(active);
        gamePanel.SetActive(active);
        holeCompletePanel.SetActive(active);
        waterPenaltyPanel.SetActive(active);
    }

    // --- Build UI ---

    void BuildUI()
    {
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

        if (FindObjectOfType<UnityEngine.EventSystems.EventSystem>() == null)
        {
            GameObject es = new GameObject("EventSystem");
            es.AddComponent<UnityEngine.EventSystems.EventSystem>();
            es.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
        }

        BuildStartPanel();
        BuildLoadingPanel();
        BuildGamePanel();
        BuildHoleCompletePanel();
        BuildWaterPenaltyPanel();
    }

    void BuildStartPanel()
    {
        startPanel = CreatePanel("StartPanel", new Color(0.08f, 0.18f, 0.08f, 0.95f));

        CreateText(startPanel.transform, "Title", "GOLF",
            new Vector2(0, 250), 80, FontStyle.Bold, Color.white);

        CreateText(startPanel.transform, "Subtitle", "Real-World Hole Generation",
            new Vector2(0, 150), 32, FontStyle.Normal, new Color(0.7f, 0.9f, 0.7f));

        CreateText(startPanel.transform, "Desc",
            "Your surroundings shape the hole.\nNear water? Expect water hazards.\nIn a city? Tight fairways & bunkers.",
            new Vector2(0, 30), 24, FontStyle.Normal, new Color(0.6f, 0.8f, 0.6f, 0.8f));

        CreateButton(startPanel.transform, "GenerateBtn", "GENERATE HOLE NEAR ME",
            new Vector2(0, -120), new Vector2(620, 100),
            new Color(0.25f, 0.55f, 0.20f), Color.white, 34,
            () => GameManager.Instance.GenerateHoleNearMe());

        CreateText(startPanel.transform, "Hint",
            "Drag back from ball to aim & power\nRelease to shoot",
            new Vector2(0, -280), 24, FontStyle.Italic, new Color(0.6f, 0.8f, 0.6f, 0.5f));
    }

    void BuildLoadingPanel()
    {
        loadingPanel = CreatePanel("LoadingPanel", new Color(0.06f, 0.14f, 0.06f, 0.95f));

        CreateText(loadingPanel.transform, "LoadingIcon", "...",
            new Vector2(0, 100), 72, FontStyle.Bold, new Color(0.5f, 0.9f, 0.4f));

        loadingText = CreateText(loadingPanel.transform, "LoadingText", "SCANNING SURROUNDINGS...",
            new Vector2(0, 0), 36, FontStyle.Bold, Color.white).GetComponent<Text>();

        loadingDetailText = CreateText(loadingPanel.transform, "LoadingDetail", "",
            new Vector2(0, -80), 24, FontStyle.Normal, new Color(0.6f, 0.8f, 0.6f, 0.7f)).GetComponent<Text>();

        loadingPanel.SetActive(false);
    }

    void BuildGamePanel()
    {
        gamePanel = CreatePanel("GamePanel", Color.clear);

        // Top bar
        GameObject topBar = CreatePanel("TopBar", new Color(0, 0, 0, 0.6f), gamePanel.transform);
        RectTransform topBarRect = topBar.GetComponent<RectTransform>();
        topBarRect.anchorMin = new Vector2(0, 1);
        topBarRect.anchorMax = new Vector2(1, 1);
        topBarRect.pivot = new Vector2(0.5f, 1);
        topBarRect.anchoredPosition = Vector2.zero;
        topBarRect.sizeDelta = new Vector2(0, 180);

        // Hole name (top left)
        holeNameText = CreateText(topBar.transform, "HoleName", "",
            new Vector2(0, -22), 26, FontStyle.Bold, new Color(0.9f, 0.85f, 0.5f)).GetComponent<Text>();

        // Stroke count
        strokeText = CreateText(topBar.transform, "StrokeCount", "0",
            new Vector2(-330, -70), 64, FontStyle.Bold, Color.white).GetComponent<Text>();

        CreateText(topBar.transform, "StrokesLabel", "STROKES",
            new Vector2(-330, -120), 18, FontStyle.Normal, new Color(0.7f, 0.7f, 0.7f));

        // Biome badge
        biomeText = CreateText(topBar.transform, "Biome", "SUBURBAN",
            new Vector2(100, -65), 22, FontStyle.Bold, new Color(0.5f, 0.9f, 0.5f)).GetComponent<Text>();

        // Hole info
        holeInfoText = CreateText(topBar.transform, "HoleInfo", "PAR 3",
            new Vector2(100, -95), 22, FontStyle.Normal, Color.white).GetComponent<Text>();

        // Terrain
        terrainText = CreateText(topBar.transform, "Terrain", "TEE BOX",
            new Vector2(100, -125), 20, FontStyle.Normal, new Color(0.6f, 1f, 0.6f)).GetComponent<Text>();

        gamePanel.SetActive(false);
    }

    void BuildHoleCompletePanel()
    {
        holeCompletePanel = CreatePanel("HoleCompletePanel", new Color(0, 0, 0, 0.85f));

        scoreLabelText = CreateText(holeCompletePanel.transform, "ScoreLabel", "PAR",
            new Vector2(0, 180), 72, FontStyle.Bold, new Color(1f, 0.85f, 0.3f)).GetComponent<Text>();

        scoreDetailText = CreateText(holeCompletePanel.transform, "ScoreDetail", "",
            new Vector2(0, 90), 32, FontStyle.Normal, Color.white).GetComponent<Text>();

        holeSummaryText = CreateText(holeCompletePanel.transform, "HoleSummary", "",
            new Vector2(0, 20), 24, FontStyle.Normal, new Color(0.6f, 0.8f, 0.6f)).GetComponent<Text>();

        // Same location button
        CreateButton(holeCompletePanel.transform, "PlayAgainBtn", "PLAY AGAIN",
            new Vector2(0, -100), new Vector2(500, 90),
            new Color(0.25f, 0.55f, 0.20f), Color.white, 34,
            () =>
            {
                holeCompletePanel.SetActive(false);
                GameManager.Instance.GenerateHoleNearMe();
            });

        // Different location button
        CreateButton(holeCompletePanel.transform, "NewLocationBtn", "SHIFT LOCATION",
            new Vector2(0, -220), new Vector2(500, 70),
            new Color(0.3f, 0.3f, 0.3f), new Color(0.8f, 0.8f, 0.8f), 24,
            () =>
            {
                Vector2 loc = LocationProvider.GetLocation();
                LocationProvider.SetManualLocation(loc.x + 0.005f, loc.y + 0.005f);
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

    // --- Biome colors for the badge ---

    Color GetBiomeColor(LocationProfile.Biome biome)
    {
        switch (biome)
        {
            case LocationProfile.Biome.Urban:    return new Color(0.8f, 0.7f, 0.5f);  // warm tan
            case LocationProfile.Biome.Park:     return new Color(0.4f, 0.9f, 0.4f);  // bright green
            case LocationProfile.Biome.Forest:   return new Color(0.2f, 0.7f, 0.3f);  // deep green
            case LocationProfile.Biome.Coastal:  return new Color(0.5f, 0.8f, 1.0f);  // sky blue
            case LocationProfile.Biome.Desert:   return new Color(0.9f, 0.8f, 0.4f);  // sand gold
            case LocationProfile.Biome.Lakeside: return new Color(0.3f, 0.6f, 0.9f);  // lake blue
            case LocationProfile.Biome.Mountain: return new Color(0.7f, 0.7f, 0.8f);  // stone grey
            case LocationProfile.Biome.Farmland: return new Color(0.6f, 0.8f, 0.3f);  // meadow
            default:                             return new Color(0.5f, 0.9f, 0.5f);  // default green
        }
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
        rt.sizeDelta = new Vector2(800, fontSize * 2 + 40);

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

        ColorBlock colors = btn.colors;
        colors.normalColor = Color.white;
        colors.highlightedColor = new Color(0.9f, 0.9f, 0.9f);
        colors.pressedColor = new Color(0.7f, 0.7f, 0.7f);
        btn.colors = colors;

        btn.onClick.AddListener(onClick);

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
