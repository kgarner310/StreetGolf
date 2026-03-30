using UnityEngine;

/// <summary>
/// Central game manager. Tracks strokes, game state, and coordinates
/// between hole generation and ball control.
/// </summary>
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("References")]
    public HoleGenerator holeGenerator;
    public BallController ballController;
    public UIManager uiManager;
    public CameraController cameraController;

    [Header("Game State")]
    public int currentStrokes = 0;
    public bool holeComplete = false;
    public bool roundActive = false;
    public int par = 3;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
            return;
        }

        Application.targetFrameRate = 60;
    }

    void Start()
    {
        LocationProvider.StartLocationService();
        uiManager.ShowStartScreen();
    }

    /// <summary>
    /// Called when player taps "Generate Hole Near Me".
    /// </summary>
    public void GenerateHoleNearMe()
    {
        currentStrokes = 0;
        holeComplete = false;
        roundActive = true;
        uiManager.UpdateStrokeCount(0);

        Vector2 location = LocationProvider.GetLocation();
        holeGenerator.GenerateHole(location.x, location.y);

        Vector2 teePos = holeGenerator.GetTeePosition();
        ballController.PlaceBall(teePos);
        ballController.SetActive(true);

        cameraController.SnapToPosition(teePos);

        uiManager.ShowGameScreen();
        uiManager.UpdateHoleInfo(par, location);
        uiManager.UpdateTerrainDisplay("Tee Box");
    }

    public void OnShotTaken()
    {
        currentStrokes++;
        uiManager.UpdateStrokeCount(currentStrokes);
    }

    public void AddPenaltyStroke()
    {
        currentStrokes++;
        uiManager.UpdateStrokeCount(currentStrokes);
    }

    public void OnBallStopped(Vector2 position)
    {
        if (holeComplete) return;

        HoleGenerator.TerrainType terrain = holeGenerator.GetTerrainAtWorldPos(position);
        string terrainName = terrain.ToString();
        uiManager.UpdateTerrainDisplay(terrainName);
    }

    public void OnHoleComplete()
    {
        holeComplete = true;
        roundActive = false;
        ballController.SetActive(false);

        string scoreLabel = GetScoreLabel(currentStrokes, par);
        uiManager.ShowHoleComplete(currentStrokes, par, scoreLabel);
    }

    string GetScoreLabel(int strokes, int holePar)
    {
        int diff = strokes - holePar;
        if (strokes == 1) return "HOLE IN ONE!";
        if (diff <= -2) return "Eagle!";
        if (diff == -1) return "Birdie!";
        if (diff == 0) return "Par";
        if (diff == 1) return "Bogey";
        if (diff == 2) return "Double Bogey";
        if (diff == 3) return "Triple Bogey";
        return "+" + diff;
    }
}
