using UnityEngine;

/// <summary>
/// Bootstraps the entire scene at runtime. Attach this to a single empty
/// GameObject in your scene — it creates everything else automatically.
///
/// Just: create empty scene → add one empty GameObject → add this script → Play.
/// </summary>
public class SceneBootstrap : MonoBehaviour
{
    void Awake()
    {
        // 1. Camera
        Camera cam = Camera.main;
        if (cam == null)
        {
            GameObject camObj = new GameObject("MainCamera");
            cam = camObj.AddComponent<Camera>();
            camObj.tag = "MainCamera";
        }
        cam.orthographic = true;
        cam.orthographicSize = 8f;
        cam.backgroundColor = new Color(0.10f, 0.28f, 0.10f);
        cam.transform.position = new Vector3(0, 0, -10);
        cam.clearFlags = CameraClearFlags.SolidColor;

        // 2. Hole Generator
        GameObject holeObj = new GameObject("HoleGenerator");
        HoleGenerator holeGen = holeObj.AddComponent<HoleGenerator>();

        // 3. Location Data Fetcher (OSM Overpass)
        GameObject fetcherObj = new GameObject("LocationDataFetcher");
        LocationDataFetcher fetcher = fetcherObj.AddComponent<LocationDataFetcher>();

        // 4. Ball
        GameObject ballObj = new GameObject("Ball");
        BallController ball = ballObj.AddComponent<BallController>();
        ball.holeGenerator = holeGen;
        ball.SetActive(false);

        // 5. Camera Controller
        CameraController camCtrl = cam.gameObject.AddComponent<CameraController>();
        camCtrl.ballTransform = ballObj.transform;

        // 6. UI Canvas
        GameObject canvasObj = new GameObject("UICanvas");
        UIManager ui = canvasObj.AddComponent<UIManager>();

        // 7. Game Manager
        GameObject gmObj = new GameObject("GameManager");
        GameManager gm = gmObj.AddComponent<GameManager>();
        gm.holeGenerator = holeGen;
        gm.ballController = ball;
        gm.uiManager = ui;
        gm.cameraController = camCtrl;
        gm.locationFetcher = fetcher;

        Debug.Log("SceneBootstrap: All systems created (with OSM location fetcher).");
    }
}
