using UnityEngine;

namespace StreetGolf.Core
{
    /// <summary>
    /// Legacy bootstrap — superseded by RuntimeSceneBuilder which constructs the
    /// entire scene at runtime. Kept as a lightweight fallback entry point.
    /// </summary>
    public class SceneBootstrap : MonoBehaviour
    {
        private void Awake()
        {
            // RuntimeSceneBuilder handles everything now.
            // If no RuntimeSceneBuilder exists, this is a manual scene setup.
            if (FindFirstObjectByType<RuntimeSceneBuilder>() != null)
                return;

            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            Input.multiTouchEnabled = false;

            Debug.Log("StreetGolf: SceneBootstrap fallback active. Use RuntimeSceneBuilder for full setup.");
        }
    }
}
