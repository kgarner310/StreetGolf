using UnityEngine;

namespace StreetGolf.Visual
{
    /// <summary>
    /// Animates the flag cloth to flutter in the wind.
    /// Displaces mesh vertices using a sine wave.
    /// </summary>
    public class FlagFlutter : MonoBehaviour
    {
        [SerializeField] private float speed = 5f;
        [SerializeField] private float amplitude = 0.02f;

        private MeshFilter meshFilter;
        private Vector3[] baseVertices;

        private void Start()
        {
            meshFilter = GetComponent<MeshFilter>();
            if (meshFilter != null && meshFilter.mesh != null)
                baseVertices = meshFilter.mesh.vertices;
        }

        private void Update()
        {
            if (meshFilter == null || baseVertices == null) return;

            Mesh mesh = meshFilter.mesh;
            Vector3[] verts = new Vector3[baseVertices.Length];

            for (int i = 0; i < verts.Length; i++)
            {
                Vector3 v = baseVertices[i];
                // Displacement increases with distance from pole (x=0 edge)
                float distFromPole = Mathf.Abs(v.x);
                float wave = Mathf.Sin(Time.time * speed + v.x * 10f) * amplitude * distFromPole * 5f;
                v.z += wave;
                verts[i] = v;
            }

            mesh.vertices = verts;
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
        }
    }
}
