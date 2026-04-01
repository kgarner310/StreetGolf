using UnityEngine;

namespace StreetGolf.Visual
{
    /// <summary>
    /// Procedural mesh generation for all 3D game objects.
    /// Creates meshes at runtime so no imported assets are needed.
    /// </summary>
    public static class MeshFactory
    {
        public static Mesh CreateSphere(float radius = 0.02f, int lonSegments = 16, int latSegments = 12)
        {
            Mesh mesh = new Mesh { name = "GolfBallMesh" };

            int vertCount = (lonSegments + 1) * (latSegments + 1);
            Vector3[] verts = new Vector3[vertCount];
            Vector3[] normals = new Vector3[vertCount];
            Vector2[] uvs = new Vector2[vertCount];

            int idx = 0;
            for (int lat = 0; lat <= latSegments; lat++)
            {
                float theta = Mathf.PI * lat / latSegments;
                float sinTheta = Mathf.Sin(theta);
                float cosTheta = Mathf.Cos(theta);

                for (int lon = 0; lon <= lonSegments; lon++)
                {
                    float phi = 2f * Mathf.PI * lon / lonSegments;
                    float x = sinTheta * Mathf.Cos(phi);
                    float y = cosTheta;
                    float z = sinTheta * Mathf.Sin(phi);

                    verts[idx] = new Vector3(x, y, z) * radius;
                    normals[idx] = new Vector3(x, y, z);
                    uvs[idx] = new Vector2((float)lon / lonSegments, (float)lat / latSegments);
                    idx++;
                }
            }

            int[] tris = new int[lonSegments * latSegments * 6];
            int ti = 0;
            for (int lat = 0; lat < latSegments; lat++)
            {
                for (int lon = 0; lon < lonSegments; lon++)
                {
                    int a = lat * (lonSegments + 1) + lon;
                    int b = a + lonSegments + 1;

                    tris[ti++] = a; tris[ti++] = b; tris[ti++] = a + 1;
                    tris[ti++] = b; tris[ti++] = b + 1; tris[ti++] = a + 1;
                }
            }

            mesh.vertices = verts;
            mesh.normals = normals;
            mesh.uv = uvs;
            mesh.triangles = tris;
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Mesh CreateCylinder(float radius = 0.01f, float height = 1f, int segments = 8)
        {
            Mesh mesh = new Mesh { name = "CylinderMesh" };

            int vertCount = (segments + 1) * 2 + (segments + 1) * 2; // sides + caps
            Vector3[] verts = new Vector3[vertCount];
            Vector3[] normals = new Vector3[vertCount];
            Vector2[] uvs = new Vector2[vertCount];

            float halfH = height * 0.5f;
            int idx = 0;

            // Side vertices
            for (int i = 0; i <= segments; i++)
            {
                float angle = 2f * Mathf.PI * i / segments;
                float x = Mathf.Cos(angle) * radius;
                float z = Mathf.Sin(angle) * radius;
                Vector3 normal = new Vector3(Mathf.Cos(angle), 0, Mathf.Sin(angle));

                verts[idx] = new Vector3(x, -halfH, z);
                normals[idx] = normal;
                uvs[idx] = new Vector2((float)i / segments, 0);
                idx++;

                verts[idx] = new Vector3(x, halfH, z);
                normals[idx] = normal;
                uvs[idx] = new Vector2((float)i / segments, 1);
                idx++;
            }

            // Cap center vertices
            int topCenterIdx = idx;
            verts[idx] = new Vector3(0, halfH, 0);
            normals[idx] = Vector3.up;
            uvs[idx] = new Vector2(0.5f, 0.5f);
            idx++;

            int botCenterIdx = idx;
            verts[idx] = new Vector3(0, -halfH, 0);
            normals[idx] = Vector3.down;
            uvs[idx] = new Vector2(0.5f, 0.5f);
            idx++;

            // Cap ring vertices
            int capStart = idx;
            for (int i = 0; i <= segments; i++)
            {
                float angle = 2f * Mathf.PI * i / segments;
                float x = Mathf.Cos(angle) * radius;
                float z = Mathf.Sin(angle) * radius;

                verts[idx] = new Vector3(x, halfH, z);
                normals[idx] = Vector3.up;
                uvs[idx] = new Vector2(x / radius * 0.5f + 0.5f, z / radius * 0.5f + 0.5f);
                idx++;

                verts[idx] = new Vector3(x, -halfH, z);
                normals[idx] = Vector3.down;
                uvs[idx] = new Vector2(x / radius * 0.5f + 0.5f, z / radius * 0.5f + 0.5f);
                idx++;
            }

            // Resize arrays to actual count
            System.Array.Resize(ref verts, idx);
            System.Array.Resize(ref normals, idx);
            System.Array.Resize(ref uvs, idx);

            // Triangles
            var triList = new System.Collections.Generic.List<int>();

            // Side faces
            for (int i = 0; i < segments; i++)
            {
                int bl = i * 2;
                int tl = bl + 1;
                int br = bl + 2;
                int tr = bl + 3;
                triList.Add(bl); triList.Add(tl); triList.Add(br);
                triList.Add(tl); triList.Add(tr); triList.Add(br);
            }

            // Top cap
            for (int i = 0; i < segments; i++)
            {
                int curr = capStart + i * 2;
                int next = capStart + (i + 1) * 2;
                triList.Add(topCenterIdx); triList.Add(curr); triList.Add(next);
            }

            // Bottom cap
            for (int i = 0; i < segments; i++)
            {
                int curr = capStart + i * 2 + 1;
                int next = capStart + (i + 1) * 2 + 1;
                triList.Add(botCenterIdx); triList.Add(next); triList.Add(curr);
            }

            mesh.vertices = verts;
            mesh.normals = normals;
            mesh.uv = uvs;
            mesh.triangles = triList.ToArray();
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Mesh CreateDisc(float radius = 0.5f, int segments = 24)
        {
            Mesh mesh = new Mesh { name = "DiscMesh" };

            Vector3[] verts = new Vector3[segments + 2];
            Vector3[] normals = new Vector3[segments + 2];
            Vector2[] uvs = new Vector2[segments + 2];

            // Center
            verts[0] = Vector3.zero;
            normals[0] = Vector3.up;
            uvs[0] = new Vector2(0.5f, 0.5f);

            for (int i = 0; i <= segments; i++)
            {
                float angle = 2f * Mathf.PI * i / segments;
                float x = Mathf.Cos(angle) * radius;
                float z = Mathf.Sin(angle) * radius;

                verts[i + 1] = new Vector3(x, 0, z);
                normals[i + 1] = Vector3.up;
                uvs[i + 1] = new Vector2(x / radius * 0.5f + 0.5f, z / radius * 0.5f + 0.5f);
            }

            int[] tris = new int[segments * 3];
            for (int i = 0; i < segments; i++)
            {
                tris[i * 3] = 0;
                tris[i * 3 + 1] = i + 1;
                tris[i * 3 + 2] = i + 2;
            }

            mesh.vertices = verts;
            mesh.normals = normals;
            mesh.uv = uvs;
            mesh.triangles = tris;
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Mesh CreateRing(float innerRadius = 0.4f, float outerRadius = 0.5f, int segments = 24)
        {
            Mesh mesh = new Mesh { name = "RingMesh" };

            int vertCount = (segments + 1) * 2;
            Vector3[] verts = new Vector3[vertCount];
            Vector3[] normals = new Vector3[vertCount];
            Vector2[] uvs = new Vector2[vertCount];

            for (int i = 0; i <= segments; i++)
            {
                float angle = 2f * Mathf.PI * i / segments;
                float cos = Mathf.Cos(angle);
                float sin = Mathf.Sin(angle);
                float t = (float)i / segments;

                verts[i * 2] = new Vector3(cos * innerRadius, 0, sin * innerRadius);
                verts[i * 2 + 1] = new Vector3(cos * outerRadius, 0, sin * outerRadius);
                normals[i * 2] = Vector3.up;
                normals[i * 2 + 1] = Vector3.up;
                uvs[i * 2] = new Vector2(t, 0);
                uvs[i * 2 + 1] = new Vector2(t, 1);
            }

            int[] tris = new int[segments * 6];
            for (int i = 0; i < segments; i++)
            {
                int a = i * 2;
                tris[i * 6] = a;     tris[i * 6 + 1] = a + 1; tris[i * 6 + 2] = a + 2;
                tris[i * 6 + 3] = a + 1; tris[i * 6 + 4] = a + 3; tris[i * 6 + 5] = a + 2;
            }

            mesh.vertices = verts;
            mesh.normals = normals;
            mesh.uv = uvs;
            mesh.triangles = tris;
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Mesh CreateArrow(float length = 0.3f, float width = 0.1f)
        {
            Mesh mesh = new Mesh { name = "ArrowMesh" };

            float shaftLen = length * 0.6f;
            float shaftW = width * 0.3f;
            float headLen = length * 0.4f;

            Vector3[] verts = new Vector3[]
            {
                // Shaft (quad)
                new Vector3(-shaftW, 0, 0),
                new Vector3(shaftW, 0, 0),
                new Vector3(shaftW, 0, shaftLen),
                new Vector3(-shaftW, 0, shaftLen),
                // Arrow head (triangle)
                new Vector3(-width * 0.5f, 0, shaftLen),
                new Vector3(width * 0.5f, 0, shaftLen),
                new Vector3(0, 0, shaftLen + headLen),
            };

            Vector3[] normals = new Vector3[7];
            for (int i = 0; i < 7; i++) normals[i] = Vector3.up;

            Vector2[] uvs = new Vector2[]
            {
                new Vector2(0.3f, 0), new Vector2(0.7f, 0),
                new Vector2(0.7f, 0.6f), new Vector2(0.3f, 0.6f),
                new Vector2(0, 0.6f), new Vector2(1, 0.6f),
                new Vector2(0.5f, 1),
            };

            int[] tris = new int[]
            {
                0, 3, 1, 1, 3, 2, // shaft
                4, 6, 5,           // head
            };

            mesh.vertices = verts;
            mesh.normals = normals;
            mesh.uv = uvs;
            mesh.triangles = tris;
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Mesh CreateQuad(float width = 0.2f, float height = 0.12f)
        {
            Mesh mesh = new Mesh { name = "FlagQuad" };

            mesh.vertices = new Vector3[]
            {
                new Vector3(0, 0, 0),
                new Vector3(width, 0, 0),
                new Vector3(width, -height, 0),
                new Vector3(0, -height, 0),
            };

            mesh.normals = new Vector3[]
            {
                Vector3.back, Vector3.back, Vector3.back, Vector3.back,
            };

            mesh.uv = new Vector2[]
            {
                new Vector2(0, 1), new Vector2(1, 1),
                new Vector2(1, 0), new Vector2(0, 0),
            };

            mesh.triangles = new int[] { 0, 1, 2, 0, 2, 3 };
            mesh.RecalculateBounds();
            return mesh;
        }
    }
}
