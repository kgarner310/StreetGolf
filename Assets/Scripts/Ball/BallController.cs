using UnityEngine;

/// <summary>
/// Handles ball aiming, power, shot execution, and movement.
/// The ball moves in 2D (top-down view). No physics engine needed —
/// we simulate simple deceleration with terrain friction.
/// </summary>
public class BallController : MonoBehaviour
{
    [Header("References")]
    public HoleGenerator holeGenerator;
    public LineRenderer aimLine;
    public GameObject powerBarFill; // UI element for power meter

    [Header("Shot Settings")]
    public float maxPower = 12f;
    public float minPower = 1f;
    public float powerChargeSpeed = 6f; // units per second while holding

    [Header("Ball Movement")]
    public float baseFriction = 0.97f;       // per-frame multiplier
    public float roughFriction = 0.92f;       // rough slows faster
    public float sandFriction = 0.85f;        // sand slows much faster
    public float greenFriction = 0.95f;       // green is smooth
    public float waterPenaltyDistance = 1.5f;  // how far back from water edge
    public float stopThreshold = 0.02f;        // speed below this = stopped

    [Header("Hole Detection")]
    public float holeRadius = 0.3f;  // distance to pin to count as "in the hole"
    public float maxHoleSpeed = 3f;  // ball must be slow enough to drop in

    // State
    private bool aimingEnabled = false;
    private bool isCharging = false;
    private bool ballMoving = false;
    private float currentPower = 0f;
    private Vector2 aimDirection = Vector2.up;
    private Vector2 velocity = Vector2.zero;
    private bool inWater = false;
    private Vector2 lastSafePosition;

    void Update()
    {
        if (ballMoving)
        {
            UpdateBallMovement();
            return;
        }

        if (!aimingEnabled) return;

        HandleAiming();
        HandlePowerCharge();
    }

    /// <summary>
    /// Place the ball at a position (used at tee and after water penalty).
    /// </summary>
    public void PlaceBall(Vector2 position)
    {
        transform.position = new Vector3(position.x, position.y, -1f); // z=-1 to render above tiles
        velocity = Vector2.zero;
        ballMoving = false;
        lastSafePosition = position;
    }

    public void EnableAiming(bool enabled)
    {
        aimingEnabled = enabled;
        if (aimLine != null)
            aimLine.enabled = enabled;
    }

    void HandleAiming()
    {
        // On mobile: use touch position. In editor: use mouse.
        Vector2 inputPos = Vector2.zero;
        bool hasInput = false;

        if (Input.touchCount > 0 && !isCharging)
        {
            inputPos = Input.GetTouch(0).position;
            hasInput = true;
        }
        else if (Input.GetMouseButton(0) && !isCharging)
        {
            inputPos = Input.mousePosition;
            hasInput = true;
        }

        if (hasInput)
        {
            // Convert screen position to world position
            Vector3 worldPos = Camera.main.ScreenToWorldPoint(inputPos);
            worldPos.z = 0;

            // Direction from ball to touch point
            Vector2 ballPos = transform.position;
            Vector2 dir = ((Vector2)worldPos - ballPos).normalized;

            if (dir.sqrMagnitude > 0.01f)
            {
                aimDirection = dir;
                UpdateAimLine();
            }
        }
    }

    void HandlePowerCharge()
    {
        // Tap and hold to charge power, release to shoot
        bool pressing = Input.GetMouseButton(0) || Input.touchCount > 0;
        bool justPressed = Input.GetMouseButtonDown(0) ||
                           (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began);
        bool justReleased = Input.GetMouseButtonUp(0) ||
                            (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Ended);

        // Start charging on second tap (first tap aims)
        if (justPressed && !isCharging)
        {
            isCharging = true;
            currentPower = minPower;
        }

        if (isCharging && pressing)
        {
            currentPower += powerChargeSpeed * Time.deltaTime;
            currentPower = Mathf.Clamp(currentPower, minPower, maxPower);
            UpdatePowerBar(currentPower / maxPower);
        }

        if (isCharging && justReleased)
        {
            ExecuteShot();
        }
    }

    void ExecuteShot()
    {
        isCharging = false;
        ballMoving = true;
        aimingEnabled = false;

        if (aimLine != null)
            aimLine.enabled = false;

        velocity = aimDirection * currentPower;
        currentPower = 0f;
        UpdatePowerBar(0f);

        // Track the stroke
        GameManager.Instance.OnShotTaken();

        Debug.Log($"Shot! Direction={aimDirection}, Power={velocity.magnitude}");
    }

    void UpdateBallMovement()
    {
        Vector2 pos = transform.position;

        // Get terrain at current position
        HoleGenerator.TerrainType terrain = holeGenerator.GetTerrainAtWorldPos(pos);

        // Apply terrain-specific friction
        float friction = baseFriction;
        switch (terrain)
        {
            case HoleGenerator.TerrainType.Rough:   friction = roughFriction; break;
            case HoleGenerator.TerrainType.Sand:     friction = sandFriction; break;
            case HoleGenerator.TerrainType.Green:    friction = greenFriction; break;
            case HoleGenerator.TerrainType.Fairway:  friction = baseFriction; break;
            case HoleGenerator.TerrainType.Water:
                HandleWaterHazard();
                return;
        }

        velocity *= friction;

        // Move ball
        pos += velocity * Time.deltaTime * 60f; // 60fps normalized
        transform.position = new Vector3(pos.x, pos.y, -1f);

        // Remember last safe (non-water) position
        if (terrain != HoleGenerator.TerrainType.Water)
        {
            lastSafePosition = pos;
        }

        // Check if ball is in the hole
        float distToPin = Vector2.Distance(pos, holeGenerator.GetPinPosition());
        if (distToPin < holeRadius && velocity.magnitude < maxHoleSpeed)
        {
            BallInHole();
            return;
        }

        // Check if ball stopped
        if (velocity.magnitude < stopThreshold)
        {
            velocity = Vector2.zero;
            ballMoving = false;

            // Re-enable aiming for next shot
            if (!GameManager.Instance.holeComplete)
            {
                EnableAiming(true);
            }
        }
    }

    void HandleWaterHazard()
    {
        // Ball in water — penalty stroke + place back at last safe position
        velocity = Vector2.zero;
        ballMoving = false;

        GameManager.Instance.OnShotTaken(); // penalty stroke

        PlaceBall(lastSafePosition);
        EnableAiming(true);

        Debug.Log("Ball in water! Penalty stroke added.");

        // Notify UI
        if (GameManager.Instance.uiManager != null)
        {
            GameManager.Instance.uiManager.ShowWaterPenalty();
        }
    }

    void BallInHole()
    {
        velocity = Vector2.zero;
        ballMoving = false;

        // Snap ball to pin position
        Vector2 pinPos = holeGenerator.GetPinPosition();
        transform.position = new Vector3(pinPos.x, pinPos.y, -1f);

        GameManager.Instance.OnHoleComplete();
        Debug.Log("Ball in the hole!");
    }

    void UpdateAimLine()
    {
        if (aimLine == null) return;

        aimLine.enabled = true;
        Vector3 start = transform.position;
        Vector3 end = start + (Vector3)(aimDirection * 2f); // 2 unit aim line

        aimLine.SetPosition(0, new Vector3(start.x, start.y, -0.5f));
        aimLine.SetPosition(1, new Vector3(end.x, end.y, -0.5f));
    }

    void UpdatePowerBar(float fillPercent)
    {
        if (powerBarFill != null)
        {
            powerBarFill.transform.localScale = new Vector3(fillPercent, 1f, 1f);
        }
    }
}
