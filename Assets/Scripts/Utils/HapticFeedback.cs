using UnityEngine;

namespace StreetGolf.Utils
{
    /// <summary>
    /// Triggers haptic feedback on mobile devices for shot impacts, sinks, etc.
    /// </summary>
    public static class HapticFeedback
    {
#if UNITY_IOS
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void _HapticLight();
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void _HapticMedium();
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void _HapticHeavy();
#endif

        public static void Light()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            Vibrate(20);
#elif UNITY_IOS && !UNITY_EDITOR
            _HapticLight();
#endif
        }

        public static void Medium()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            Vibrate(40);
#elif UNITY_IOS && !UNITY_EDITOR
            _HapticMedium();
#endif
        }

        public static void Heavy()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            Vibrate(80);
#elif UNITY_IOS && !UNITY_EDITOR
            _HapticHeavy();
#endif
        }

        private static void Vibrate(long milliseconds)
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using var unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
                using var activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
                using var vibrator = activity.Call<AndroidJavaObject>("getSystemService", "vibrator");
                vibrator.Call("vibrate", milliseconds);
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"Haptic failed: {e.Message}");
            }
#endif
        }
    }
}
