using UnityEngine;

namespace StreetGolf.Visual
{
    /// <summary>
    /// Creates materials at runtime using available shaders.
    /// Tries URP first, falls back to Standard, then Sprites/Default.
    /// </summary>
    public static class MaterialFactory
    {
        private static Shader _opaqueShader;
        private static Shader _transparentShader;

        private static Shader OpaqueShader
        {
            get
            {
                if (_opaqueShader == null)
                {
                    _opaqueShader = Shader.Find("Universal Render Pipeline/Lit")
                                 ?? Shader.Find("Standard")
                                 ?? Shader.Find("Sprites/Default");
                }
                return _opaqueShader;
            }
        }

        private static Shader TransparentShader
        {
            get
            {
                if (_transparentShader == null)
                {
                    _transparentShader = Shader.Find("Universal Render Pipeline/Unlit")
                                      ?? Shader.Find("Unlit/Transparent")
                                      ?? Shader.Find("Sprites/Default");
                }
                return _transparentShader;
            }
        }

        private static Material CreateOpaque(Color color, float smoothness = 0.5f, float metallic = 0f)
        {
            var mat = new Material(OpaqueShader);
            mat.color = color;

            if (mat.HasProperty("_Smoothness"))
                mat.SetFloat("_Smoothness", smoothness);
            else if (mat.HasProperty("_Glossiness"))
                mat.SetFloat("_Glossiness", smoothness);

            if (mat.HasProperty("_Metallic"))
                mat.SetFloat("_Metallic", metallic);

            return mat;
        }

        private static Material CreateTransparent(Color color)
        {
            var mat = new Material(TransparentShader);
            mat.color = color;

            // URP transparency setup
            if (mat.HasProperty("_Surface"))
            {
                mat.SetFloat("_Surface", 1f); // Transparent
                mat.SetFloat("_Blend", 0f);   // Alpha
                mat.SetOverrideTag("RenderType", "Transparent");
                mat.renderQueue = 3000;
                mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                mat.EnableKeyword("_ALPHABLEND_ON");
            }

            // Standard shader transparency
            if (mat.HasProperty("_Mode"))
            {
                mat.SetFloat("_Mode", 3f); // Transparent
                mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                mat.SetInt("_ZWrite", 0);
                mat.DisableKeyword("_ALPHATEST_ON");
                mat.EnableKeyword("_ALPHABLEND_ON");
                mat.DisableKeyword("_ALPHAPREMULTIPLY_ON");
                mat.renderQueue = 3000;
            }

            return mat;
        }

        // --- Public material creators ---

        public static Material BallMaterial()
        {
            return CreateOpaque(Color.white, smoothness: 0.85f);
        }

        public static Material GreenMaterial()
        {
            return CreateOpaque(new Color(0.1f, 0.55f, 0.15f), smoothness: 0.3f);
        }

        public static Material HoleCupMaterial()
        {
            return CreateOpaque(new Color(0.12f, 0.08f, 0.04f), smoothness: 0.2f);
        }

        public static Material FlagPoleMaterial()
        {
            return CreateOpaque(new Color(0.85f, 0.85f, 0.85f), smoothness: 0.6f, metallic: 0.4f);
        }

        public static Material FlagClothMaterial()
        {
            var mat = CreateOpaque(new Color(0.9f, 0.1f, 0.1f), smoothness: 0.2f);
            mat.doubleSidedGI = true;
            if (mat.HasProperty("_Cull"))
                mat.SetFloat("_Cull", 0f); // Render both sides
            return mat;
        }

        public static Material ArrowMaterial()
        {
            return CreateTransparent(new Color(1f, 0.85f, 0.2f, 0.7f));
        }

        public static Material LandingMarkerMaterial()
        {
            return CreateTransparent(new Color(1f, 1f, 1f, 0.35f));
        }

        public static Material AimLineMaterial()
        {
            var mat = CreateTransparent(new Color(1f, 1f, 1f, 0.5f));
            return mat;
        }

        public static Material DirectionLineMaterial()
        {
            return CreateTransparent(new Color(0.8f, 0.9f, 0.2f, 0.4f));
        }

        public static Material TrailMaterial()
        {
            var mat = new Material(Shader.Find("Sprites/Default") ?? TransparentShader);
            mat.color = new Color(1f, 1f, 1f, 0.6f);
            return mat;
        }

        public static Material PulseRingMaterial()
        {
            return CreateTransparent(new Color(0.2f, 0.9f, 0.3f, 0.4f));
        }
    }
}
