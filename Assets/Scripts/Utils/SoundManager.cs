using UnityEngine;

namespace StreetGolf.Utils
{
    /// <summary>
    /// Handles game audio — shot sounds, ball rolling, hole sink, ambient street noise.
    /// </summary>
    public class SoundManager : MonoBehaviour
    {
        public static SoundManager Instance { get; private set; }

        [Header("Shot Sounds")]
        [SerializeField] private AudioClip shotHit;
        [SerializeField] private AudioClip[] bounceSounds;
        [SerializeField] private AudioClip rollLoop;
        [SerializeField] private AudioClip holeSink;
        [SerializeField] private AudioClip applause;

        [Header("UI Sounds")]
        [SerializeField] private AudioClip buttonTap;
        [SerializeField] private AudioClip scoreReveal;

        private AudioSource sfxSource;
        private AudioSource rollSource;

        private void Awake()
        {
            if (Instance != null)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            sfxSource = gameObject.AddComponent<AudioSource>();
            rollSource = gameObject.AddComponent<AudioSource>();
            rollSource.loop = true;
        }

        public void PlayShot()
        {
            PlayClip(shotHit);
            HapticFeedback.Medium();
        }

        public void PlayBounce()
        {
            if (bounceSounds != null && bounceSounds.Length > 0)
            {
                var clip = bounceSounds[Random.Range(0, bounceSounds.Length)];
                PlayClip(clip, 0.6f);
                HapticFeedback.Light();
            }
        }

        public void StartRolling()
        {
            if (rollLoop != null && !rollSource.isPlaying)
            {
                rollSource.clip = rollLoop;
                rollSource.volume = 0.3f;
                rollSource.Play();
            }
        }

        public void StopRolling()
        {
            rollSource.Stop();
        }

        public void PlayHoleSink()
        {
            PlayClip(holeSink);
            HapticFeedback.Heavy();

            if (applause != null)
                sfxSource.PlayOneShot(applause, 0.5f);
        }

        public void PlayButtonTap()
        {
            PlayClip(buttonTap, 0.5f);
        }

        private void PlayClip(AudioClip clip, float volume = 1f)
        {
            if (clip != null)
                sfxSource.PlayOneShot(clip, volume);
        }
    }
}
