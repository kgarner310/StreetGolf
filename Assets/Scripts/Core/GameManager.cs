using UnityEngine;

/// <summary>
/// Central game manager. Coordinates the flow:
/// 1. Player taps "Generate Hole Near Me"
/// 2. GPS coords are fetched
/// 3. OSM Overpass is queried for nearby features
/// 4. LocationProfile is built (biome, water, bunkers, etc.)
/// 5. Hole is generated from profile + coord seed
/// 6. Player plays the hole
/// </summary>
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("References")]
    public HoleGenerator holeGenerator;
    public BallController ballController;
    public UIManager uiManager;
    public CameraController cameraController;
    public LocationDataFetcher locationFetcher;

    [Header("Game State")]
    public int currentStrokes = 0;
    public bool holeComplete = false;
    public bool roundActive = false;
    public int par = 3;

    private Vector2 currentLocation;

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
    /// Kicks off async OSM fetch, then generates hole from profile.
    /// </summary>
    public void GenerateHoleNearMe()
    {
        currentStrokes = 0;
        holeComplete = false;
        roundActive = false;
        uiManager.UpdateStrokeCount(0);

        currentLocation = LocationProvider.GetLocation();

        // Show loading state while fetching OSM data
        uiManager.ShowLoadingScreen(currentLocation);

        // Fetch real-world surroundings, then generate
        locationFetcher.FetchProfile(currentLocation.x, currentLocation.y, OnProfileReady);
    }

    /// <summary>
    /// Called when LocationDataFetcher finishes (success or fallback).
    /// </summary>
    void OnProfileReady(LocationProfile profile)
    {
        // Generate the hole shaped by real surroundings
        holeGenerator.GenerateHole(currentLocation.x, currentLocation.y, profile);

        // Place ball on tee
        Vector2 teePos = holeGenerator.GetTeePosition();
        ballController.PlaceBall(teePos);
        ballController.SetActive(true);

        cameraController.SnapToPosition(teePos);

        roundActive = true;

        // Update UI with biome info
        uiManager.ShowGameScreen();
        uiManager.UpdateHoleInfo(par, currentLocation, profile);
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
        uiManager.UpdateTerrainDisplay(terrain.ToString());
    }

    public void OnHoleComplete()
    {
        holeComplete = true;
        roundActive = false;
        ballController.SetActive(false);

        string scoreLabel = GetScoreLabel(currentStrokes, par);
        LocationProfile profile = holeGenerator.GetProfile();
        uiManager.ShowHoleComplete(currentStrokes, par, scoreLabel, profile);
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
