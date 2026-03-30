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

    [Header("Game State")]
    public int currentStrokes = 0;
    public bool holeComplete = false;
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
        }
    }

    void Start()
    {
        // Start with UI showing "Generate Hole Near Me" button
        uiManager.ShowStartScreen();
    }

    /// <summary>
    /// Called when player taps "Generate Hole Near Me".
    /// Uses device GPS or fallback coordinates as seed.
    /// </summary>
    public void GenerateHoleNearMe()
    {
        // Reset game state
        currentStrokes = 0;
        holeComplete = false;
        uiManager.UpdateStrokeCount(0);

        // Get location (real GPS or fallback)
        Vector2 location = LocationProvider.GetLocation();

        // Generate the hole using location as seed
        holeGenerator.GenerateHole(location.x, location.y);

        // Place the ball on the tee
        Vector2 teePos = holeGenerator.GetTeePosition();
        ballController.PlaceBall(teePos);
        ballController.EnableAiming(true);

        // Update UI
        uiManager.ShowGameScreen();
        uiManager.UpdateHoleInfo(par, location);
    }

    /// <summary>
    /// Called each time the player hits the ball.
    /// </summary>
    public void OnShotTaken()
    {
        currentStrokes++;
        uiManager.UpdateStrokeCount(currentStrokes);
    }

    /// <summary>
    /// Called when the ball lands in the hole (on the green flag position).
    /// </summary>
    public void OnHoleComplete()
    {
        holeComplete = true;
        ballController.EnableAiming(false);

        string scoreLabel = GetScoreLabel(currentStrokes, par);
        uiManager.ShowHoleComplete(currentStrokes, par, scoreLabel);
    }

    string GetScoreLabel(int strokes, int holePar)
    {
        int diff = strokes - holePar;
        if (strokes == 1) return "Hole in One!";
        if (diff <= -2) return "Eagle!";
        if (diff == -1) return "Birdie!";
        if (diff == 0) return "Par";
        if (diff == 1) return "Bogey";
        if (diff == 2) return "Double Bogey";
        return "+" + diff;
    }
}
