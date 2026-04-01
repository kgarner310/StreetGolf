using System.Collections.Generic;
using UnityEngine;

namespace StreetGolf.Core
{
    /// <summary>
    /// Tracks scores across an entire round of street golf.
    /// Persists between holes and can save to local storage.
    /// </summary>
    public class Scorecard : MonoBehaviour
    {
        public static Scorecard Instance { get; private set; }

        public List<HoleResult> Results { get; private set; } = new List<HoleResult>();
        public int TotalStrokes => CalculateTotalStrokes();
        public int TotalPar => CalculateTotalPar();
        public int RelativeToPar => TotalStrokes - TotalPar;

        private void Awake()
        {
            if (Instance != null)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnHoleCompleted += RecordHole;
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnHoleCompleted -= RecordHole;
        }

        public void RecordHole(HoleResult result)
        {
            Results.Add(result);
            SaveToLocal();
        }

        public void NewRound()
        {
            Results.Clear();
        }

        private int CalculateTotalStrokes()
        {
            int total = 0;
            foreach (var r in Results) total += r.Strokes;
            return total;
        }

        private int CalculateTotalPar()
        {
            int total = 0;
            foreach (var r in Results) total += r.Par;
            return total;
        }

        private void SaveToLocal()
        {
            string json = JsonUtility.ToJson(new ScorecardData { Results = Results });
            PlayerPrefs.SetString("streetgolf_current_round", json);
            PlayerPrefs.Save();
        }

        public void LoadFromLocal()
        {
            string json = PlayerPrefs.GetString("streetgolf_current_round", "");
            if (!string.IsNullOrEmpty(json))
            {
                var data = JsonUtility.FromJson<ScorecardData>(json);
                Results = data.Results ?? new List<HoleResult>();
            }
        }

        [System.Serializable]
        private class ScorecardData
        {
            public List<HoleResult> Results;
        }
    }
}
