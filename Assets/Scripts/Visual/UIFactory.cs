using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;
using StreetGolf.UI;

namespace StreetGolf.Visual
{
    /// <summary>
    /// Builds the entire Canvas UI hierarchy at runtime.
    /// Creates HUD, score panel, minimap, and event system.
    /// </summary>
    public static class UIFactory
    {
        private static readonly Color BGDark = new Color(0, 0, 0, 0.5f);
        private static readonly Color BGPanel = new Color(0.05f, 0.05f, 0.1f, 0.85f);
        private static readonly Color AccentGreen = new Color(0.2f, 0.85f, 0.3f);

        public static Canvas CreateMainCanvas()
        {
            var go = new GameObject("UICanvas");
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;

            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.matchWidthOrHeight = 0.5f;

            go.AddComponent<GraphicRaycaster>();
            return canvas;
        }

        public static EventSystem CreateEventSystem()
        {
            var go = new GameObject("EventSystem");
            var es = go.AddComponent<EventSystem>();
            go.AddComponent<StandaloneInputModule>();
            return es;
        }

        public static GameHUD CreateGameHUD(Transform parent)
        {
            var root = CreatePanel("GameHUD", parent, AnchorPreset.StretchAll);
            var hud = root.AddComponent<GameHUD>();

            // Top bar
            var topBar = CreatePanel("TopBar", root.transform, AnchorPreset.TopStretch, 80);
            AddBackground(topBar, BGDark);

            var holeNum = CreateTMPText("HoleNumber", topBar.transform,
                new Vector2(-300, 0), "HOLE 1", 28, TextAlignmentOptions.Left);
            var holeName = CreateTMPText("HoleName", topBar.transform,
                Vector2.zero, "", 22, TextAlignmentOptions.Center);
            holeName.color = new Color(1f, 0.9f, 0.3f);
            var par = CreateTMPText("Par", topBar.transform,
                new Vector2(300, 0), "PAR 3", 28, TextAlignmentOptions.Right);

            // Center area
            var distance = CreateTMPText("Distance", root.transform,
                new Vector2(0, 200), "0m", 48, TextAlignmentOptions.Center);
            var status = CreateTMPText("Status", root.transform,
                new Vector2(0, 100), "Finding your location...", 24, TextAlignmentOptions.Center);
            status.color = new Color(0.8f, 0.8f, 0.8f);

            // Aim reticle (simple crosshair)
            var reticle = CreateReticle(root.transform);

            // Bottom area
            var strokes = CreateTMPText("Strokes", root.transform,
                new Vector2(-350, -750), "Strokes: 0", 24, TextAlignmentOptions.Left);

            // Power meter
            var powerSlider = CreatePowerMeter(root.transform, out Image powerFill);
            var powerPct = CreateTMPText("PowerPercent", root.transform,
                new Vector2(0, -850), "0%", 20, TextAlignmentOptions.Center);

            hud.Initialize(holeNum, holeName, par, distance, status, reticle,
                strokes, powerSlider, powerFill, powerPct);

            return hud;
        }

        public static HoleCompletePanel CreateHoleCompletePanel(Transform parent)
        {
            var root = CreatePanel("HoleCompleteRoot", parent, AnchorPreset.StretchAll);
            var comp = root.AddComponent<HoleCompletePanel>();

            // Panel background
            var panelBG = CreatePanel("Panel", root.transform, AnchorPreset.MiddleCenter, 500);
            var panelRT = panelBG.GetComponent<RectTransform>();
            panelRT.sizeDelta = new Vector2(700, 600);
            AddBackground(panelBG, BGPanel);

            var scoreName = CreateTMPText("ScoreName", panelBG.transform,
                new Vector2(0, 200), "Par", 52, TextAlignmentOptions.Center);
            scoreName.fontStyle = FontStyles.Bold;

            var strokesTxt = CreateTMPText("Strokes", panelBG.transform,
                new Vector2(0, 100), "3", 64, TextAlignmentOptions.Center);

            var parCompare = CreateTMPText("ParCompare", panelBG.transform,
                new Vector2(0, 40), "Even", 28, TextAlignmentOptions.Center);

            var totalStrokes = CreateTMPText("TotalStrokes", panelBG.transform,
                new Vector2(0, -30), "Total: 3", 22, TextAlignmentOptions.Center);
            totalStrokes.color = new Color(0.7f, 0.7f, 0.7f);

            var distTxt = CreateTMPText("Distance", panelBG.transform,
                new Vector2(0, -70), "50m hole", 20, TextAlignmentOptions.Center);
            distTxt.color = new Color(0.7f, 0.7f, 0.7f);

            // Next hole button
            var nextBtn = CreateButton("NextHole", panelBG.transform,
                new Vector2(0, -180), new Vector2(400, 70), "NEXT HOLE", AccentGreen);

            // Share button (placeholder)
            var shareBtn = CreateButton("Share", panelBG.transform,
                new Vector2(0, -260), new Vector2(200, 50), "Share", new Color(0.4f, 0.4f, 0.5f));

            comp.Initialize(panelBG, scoreName, strokesTxt, parCompare, totalStrokes, distTxt, nextBtn, shareBtn);
            panelBG.SetActive(false);

            return comp;
        }

        public static MiniMap CreateMiniMap(Transform parent)
        {
            // Map container in top-right corner
            var root = CreatePanel("MiniMap", parent, AnchorPreset.TopRight, 0);
            var rootRT = root.GetComponent<RectTransform>();
            rootRT.anchoredPosition = new Vector2(-20, -100);
            rootRT.sizeDelta = new Vector2(180, 180);
            AddBackground(root, new Color(0, 0, 0, 0.4f));

            var container = root.GetComponent<RectTransform>();

            // Ball icon (white dot)
            var ballIcon = CreateIcon("BallIcon", root.transform, Color.white, 10);
            // Hole icon (red dot)
            var holeIcon = CreateIcon("HoleIcon", root.transform, Color.red, 12);
            // Player icon (blue dot)
            var playerIcon = CreateIcon("PlayerIcon", root.transform, new Color(0.3f, 0.6f, 1f), 8);

            var miniMap = root.AddComponent<MiniMap>();
            miniMap.Initialize(container, ballIcon, holeIcon, playerIcon);

            return miniMap;
        }

        // --- Helpers ---

        private static Slider CreatePowerMeter(Transform parent, out Image fillImage)
        {
            var sliderGO = CreatePanel("PowerMeter", parent, AnchorPreset.BottomStretch, 30);
            var sliderRT = sliderGO.GetComponent<RectTransform>();
            sliderRT.anchoredPosition = new Vector2(0, 120);
            sliderRT.sizeDelta = new Vector2(-200, 30);

            // Background
            var bg = new GameObject("Background");
            bg.transform.SetParent(sliderGO.transform, false);
            var bgImg = bg.AddComponent<Image>();
            bgImg.color = new Color(0.2f, 0.2f, 0.2f, 0.6f);
            var bgRT = bg.GetComponent<RectTransform>();
            bgRT.anchorMin = Vector2.zero; bgRT.anchorMax = Vector2.one;
            bgRT.sizeDelta = Vector2.zero;

            // Fill area
            var fillArea = new GameObject("Fill Area");
            fillArea.transform.SetParent(sliderGO.transform, false);
            var fillAreaRT = fillArea.AddComponent<RectTransform>();
            fillAreaRT.anchorMin = Vector2.zero; fillAreaRT.anchorMax = Vector2.one;
            fillAreaRT.sizeDelta = Vector2.zero;

            var fill = new GameObject("Fill");
            fill.transform.SetParent(fillArea.transform, false);
            fillImage = fill.AddComponent<Image>();
            fillImage.color = new Color(0.2f, 0.8f, 0.2f);
            var fillRT = fill.GetComponent<RectTransform>();
            fillRT.anchorMin = Vector2.zero; fillRT.anchorMax = Vector2.one;
            fillRT.sizeDelta = Vector2.zero;

            var slider = sliderGO.AddComponent<Slider>();
            slider.fillRect = fillRT;
            slider.targetGraphic = fillImage;
            slider.interactable = false;
            slider.minValue = 0; slider.maxValue = 1; slider.value = 0;

            return slider;
        }

        private static GameObject CreateReticle(Transform parent)
        {
            var go = new GameObject("AimReticle");
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(60, 60);

            var img = go.AddComponent<Image>();
            img.color = new Color(1, 1, 1, 0.6f);

            // Create a simple + shape using child images
            CreateReticleLine(go.transform, new Vector2(30, 2)); // horizontal
            CreateReticleLine(go.transform, new Vector2(2, 30)); // vertical

            img.color = Color.clear; // container is invisible
            return go;
        }

        private static void CreateReticleLine(Transform parent, Vector2 size)
        {
            var line = new GameObject("Line");
            line.transform.SetParent(parent, false);
            var rt = line.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = size;
            var img = line.AddComponent<Image>();
            img.color = new Color(1, 1, 1, 0.7f);
        }

        private static RectTransform CreateIcon(string name, Transform parent, Color color, float size)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.sizeDelta = new Vector2(size, size);
            var img = go.AddComponent<Image>();
            img.color = color;
            return rt;
        }

        private static Button CreateButton(string name, Transform parent, Vector2 pos, Vector2 size, string text, Color bgColor)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;

            var img = go.AddComponent<Image>();
            img.color = bgColor;

            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;

            var label = new GameObject("Label");
            label.transform.SetParent(go.transform, false);
            var labelRT = label.AddComponent<RectTransform>();
            labelRT.anchorMin = Vector2.zero; labelRT.anchorMax = Vector2.one;
            labelRT.sizeDelta = Vector2.zero;
            var tmp = label.AddComponent<TextMeshProUGUI>();
            tmp.text = text;
            tmp.fontSize = 22;
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.color = Color.white;

            return btn;
        }

        private static TextMeshProUGUI CreateTMPText(string name, Transform parent,
            Vector2 pos, string text, float fontSize, TextAlignmentOptions align)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = pos;
            rt.sizeDelta = new Vector2(600, 60);

            var tmp = go.AddComponent<TextMeshProUGUI>();
            tmp.text = text;
            tmp.fontSize = fontSize;
            tmp.alignment = align;
            tmp.color = Color.white;

            return tmp;
        }

        private static void AddBackground(GameObject go, Color color)
        {
            var img = go.GetComponent<Image>() ?? go.AddComponent<Image>();
            img.color = color;
        }

        private static GameObject CreatePanel(string name, Transform parent, AnchorPreset preset, float height = 0)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();

            switch (preset)
            {
                case AnchorPreset.StretchAll:
                    rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
                    rt.sizeDelta = Vector2.zero;
                    break;
                case AnchorPreset.TopStretch:
                    rt.anchorMin = new Vector2(0, 1); rt.anchorMax = Vector2.one;
                    rt.pivot = new Vector2(0.5f, 1);
                    rt.sizeDelta = new Vector2(0, height);
                    rt.anchoredPosition = Vector2.zero;
                    break;
                case AnchorPreset.BottomStretch:
                    rt.anchorMin = Vector2.zero; rt.anchorMax = new Vector2(1, 0);
                    rt.pivot = new Vector2(0.5f, 0);
                    rt.sizeDelta = new Vector2(0, height);
                    rt.anchoredPosition = Vector2.zero;
                    break;
                case AnchorPreset.MiddleCenter:
                    rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
                    rt.sizeDelta = new Vector2(height, height);
                    break;
                case AnchorPreset.TopRight:
                    rt.anchorMin = rt.anchorMax = new Vector2(1, 1);
                    rt.pivot = new Vector2(1, 1);
                    break;
            }

            return go;
        }

        private enum AnchorPreset
        {
            StretchAll, TopStretch, BottomStretch, MiddleCenter, TopRight
        }
    }
}
