using UnityEngine;

/// <summary>
/// Top-down orthographic camera that follows the ball smoothly.
/// </summary>
public class CameraController : MonoBehaviour
{
    [Header("Target")]
    public Transform ballTransform;

    [Header("Settings")]
    public float followSpeed = 5f;
    public float defaultZoom = 8f;
    public float overviewZoom = 14f;
    public float zoomSpeed = 3f;

    private Camera cam;
    private bool showOverview = false;
    private float targetZoom;

    void Start()
    {
        cam = GetComponent<Camera>();
        if (cam == null) cam = Camera.main;
        cam.orthographic = true;
        cam.orthographicSize = defaultZoom;
        targetZoom = defaultZoom;
        transform.position = new Vector3(0, 0, -10);
    }

    void LateUpdate()
    {
        if (ballTransform == null) return;

        // Smooth follow
        Vector3 target = new Vector3(
            ballTransform.position.x,
            ballTransform.position.y,
            -10f
        );
        transform.position = Vector3.Lerp(transform.position, target, followSpeed * Time.deltaTime);

        // Smooth zoom
        cam.orthographicSize = Mathf.Lerp(cam.orthographicSize, targetZoom, zoomSpeed * Time.deltaTime);
    }

    public void SnapToPosition(Vector2 pos)
    {
        transform.position = new Vector3(pos.x, pos.y, -10f);
    }

    public void SetOverviewMode(bool overview)
    {
        showOverview = overview;
        targetZoom = overview ? overviewZoom : defaultZoom;
    }

    public void SetZoom(float zoom)
    {
        targetZoom = zoom;
    }
}
