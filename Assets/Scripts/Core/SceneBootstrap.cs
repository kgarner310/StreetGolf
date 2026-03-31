using UnityEngine;

namespace StreetGolf.Core
{
    /// <summary>
    /// Bootstraps the main game scene. Ensures all required managers exist
    /// and initializes them in the correct order.
    /// Attach this to an empty GameObject in the main scene.
    /// </summary>
    public class SceneBootstrap : MonoBehaviour
    {
        [Header("Manager Prefabs (assign in inspector)")]
        [SerializeField] private GameObject gpsServicePrefab;
        [SerializeField] private GameObject soundManagerPrefab;
        [SerializeField] private GameObject gameManagerPrefab;

        private void Awake()
        {
            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            Input.multiTouchEnabled = false;
        }

        private void Start()
        {
            // Ensure persistent managers exist
            EnsureManager<GPS.GPSLocationService>(gpsServicePrefab);
            EnsureManager<Utils.SoundManager>(soundManagerPrefab);

            Debug.Log("StreetGolf: Scene initialized. Ready to play.");
        }

        private void EnsureManager<T>(GameObject prefab) where T : MonoBehaviour
        {
            if (FindFirstObjectByType<T>() == null && prefab != null)
            {
                Instantiate(prefab);
            }
        }
    }
}
