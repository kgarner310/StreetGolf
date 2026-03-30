using UnityEngine;

/// <summary>
/// Bootstraps the entire scene at runtime. Attach this to a single empty
/// GameObject in your scene — it creates everything else automatically.
///
/// This means you don't need to manually set up GameObjects, wire references,
/// or create prefabs. Just:
/// 1. Create an empty scene
/// 2. Add one empty GameObject
/// 3. Add this script to it
/// 4. Press Play
/// </summary>
public class SceneBootstrap : MonoBehaviour
{
    void Awake()
    {
        // 1. Camera setup
        Camera cam = Camera.main;
        if (cam == null)
        {
            GameObject camObj = new GameObject("MainCamera");
            cam = camObj.AddComponent<Camera>();
            camObj.tag = "MainCamera";
        }
        cam.orthographic = true;
        cam.orthographicSize = 8f;
        cam.backgroundColor = new Color(0.10f, 0.28f, 0.10f); // Dark green background
        cam.transform.position = new Vector3(0, 0, -10);
        cam.clearFlags = CameraClearFlags.SolidColor;

        // 2. Hole Generator
        GameObject holeObj = new GameObject("HoleGenerator");
        HoleGenerator holeGen = holeObj.AddComponent<HoleGenerator>();

        // 3. Ball
        GameObject ballObj = new GameObject("Ball");
        BallController ball = ballObj.AddComponent<BallController>();
        ball.holeGenerator = holeGen;
        ball.SetActive(false);

        // 4. Camera Controller
        CameraController camCtrl = cam.gameObject.AddComponent<CameraController>();
        camCtrl.ballTransform = ballObj.transform;

        // 5. UI Canvas
        GameObject canvasObj = new GameObject("UICanvas");
        UIManager ui = canvasObj.AddComponent<UIManager>();

        // 6. Game Manager
        GameObject gmObj = new GameObject("GameManager");
        GameManager gm = gmObj.AddComponent<GameManager>();
        gm.holeGenerator = holeGen;
        gm.ballController = ball;
        gm.uiManager = ui;
        gm.cameraController = camCtrl;

        Debug.Log("SceneBootstrap: All systems created and wired.");
    }
}
