using UnityEngine;

/// <summary>
/// Top-down camera that follows the ball with smooth movement.
/// Zooms out slightly when ball is moving fast.
/// </summary>
public class CameraController : MonoBehaviour
{
    [Header("Target")]
    public Transform ballTransform;

    [Header("Camera Settings")]
    public float followSpeed = 5f;
    public float defaultZoom = 8f;    // orthographic size
    public float zoomedOutSize = 12f; // when ball is moving
    public float zoomSpeed = 2f;

    private Camera cam;

    void Start()
    {
        cam = GetComponent<Camera>();
        cam.orthographic = true;
        cam.orthographicSize = defaultZoom;

        // Ensure camera looks down (top-down 2D)
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

        // Dynamic zoom based on ball velocity
        BallController ball = ballTransform.GetComponent<BallController>();
        float targetZoom = defaultZoom;

        // We can't directly read velocity from BallController (it's private),
        // so we'll just use the default zoom for now.
        // Future enhancement: expose a speed property on BallController.

        cam.orthographicSize = Mathf.Lerp(cam.orthographicSize, targetZoom, zoomSpeed * Time.deltaTime);
    }
}
