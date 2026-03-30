using UnityEngine;

/// <summary>
/// Ball aiming (drag-back slingshot), power control, movement, and terrain interaction.
///
/// How to play:
/// 1. Touch/click the ball and drag BACKWARD (away from target)
/// 2. The aim line shows where the ball will go (opposite of drag)
/// 3. Drag distance = power
/// 4. Release to shoot
/// </summary>
public class BallController : MonoBehaviour
{
    [Header("References")]
    public HoleGenerator holeGenerator;

    [Header("Shot Settings")]
    public float maxPower = 14f;
    public float dragScale = 0.8f; // world units of drag per unit of power
    public float maxDragDistance = 5f;

    [Header("Ball Movement")]
    public float fairwayFriction = 0.975f;
    public float roughFriction = 0.940f;
    public float sandFriction = 0.880f;
    public float greenFriction = 0.960f;
    public float stopThreshold = 0.015f;

    [Header("Hole Detection")]
    public float holeRadius = 0.25f;
    public float maxHoleEntrySpeed = 4f;

    [Header("Visuals")]
    public Color ballColor = Color.white;
    public Color aimLineColor = new Color(1f, 1f, 1f, 0.6f);
    public Color powerLineColor = new Color(1f, 0.3f, 0.3f, 0.5f);

    // Internal state
    private bool active = false;
    private bool isDragging = false;
    private bool ballMoving = false;
    private Vector2 dragStartWorld;
    private Vector2 velocity;
    private Vector2 lastSafePosition;

    // Visual components (created at runtime)
    private SpriteRenderer ballSprite;
    private LineRenderer aimLine;
    private LineRenderer powerLine;
    private SpriteRenderer shadowSprite;

    void Awake()
    {
        CreateVisuals();
    }

    void Update()
    {
        if (!active) return;

        if (ballMoving)
        {
            UpdateMovement();
            return;
        }

        HandleDragInput();
    }

    // --- Setup ---

    void CreateVisuals()
    {
        // Ball sprite
        ballSprite = gameObject.AddComponent<SpriteRenderer>();
        ballSprite.sprite = HoleGenerator.CreateCircleSprite();
        ballSprite.color = ballColor;
        ballSprite.sortingOrder = 10;
        transform.localScale = new Vector3(0.22f, 0.22f, 1f);

        // Shadow (slightly offset, slightly larger, dark)
        GameObject shadow = new GameObject("BallShadow");
        shadow.transform.SetParent(transform);
        shadow.transform.localPosition = new Vector3(0.15f, -0.15f, 0.1f);
        shadow.transform.localScale = Vector3.one * 1.1f;
        shadowSprite = shadow.AddComponent<SpriteRenderer>();
        shadowSprite.sprite = HoleGenerator.CreateCircleSprite();
        shadowSprite.color = new Color(0, 0, 0, 0.3f);
        shadowSprite.sortingOrder = 9;

        // Aim line (shows shot direction)
        GameObject aimObj = new GameObject("AimLine");
        aimObj.transform.SetParent(transform, false);
        aimLine = aimObj.AddComponent<LineRenderer>();
        aimLine.positionCount = 2;
        aimLine.startWidth = 0.04f;
        aimLine.endWidth = 0.02f;
        aimLine.material = new Material(Shader.Find("Sprites/Default"));
        aimLine.startColor = aimLineColor;
        aimLine.endColor = new Color(aimLineColor.r, aimLineColor.g, aimLineColor.b, 0.1f);
        aimLine.sortingOrder = 8;
        aimLine.enabled = false;

        // Power line (shows drag direction)
        GameObject powObj = new GameObject("PowerLine");
        powObj.transform.SetParent(transform, false);
        powerLine = powObj.AddComponent<LineRenderer>();
        powerLine.positionCount = 2;
        powerLine.startWidth = 0.03f;
        powerLine.endWidth = 0.03f;
        powerLine.material = new Material(Shader.Find("Sprites/Default"));
        powerLine.startColor = powerLineColor;
        powerLine.endColor = powerLineColor;
        powerLine.sortingOrder = 7;
        powerLine.enabled = false;
    }

    public void PlaceBall(Vector2 position)
    {
        transform.position = new Vector3(position.x, position.y, -1f);
        velocity = Vector2.zero;
        ballMoving = false;
        isDragging = false;
        lastSafePosition = position;
        HideLines();
    }

    public void SetActive(bool isActive)
    {
        active = isActive;
        if (!isActive) HideLines();
    }

    // --- Input handling (slingshot drag) ---

    void HandleDragInput()
    {
        Vector2 inputScreenPos;
        bool inputDown = false;
        bool inputHeld = false;
        bool inputUp = false;

        // Unified touch/mouse input
        if (Input.touchCount > 0)
        {
            Touch touch = Input.GetTouch(0);
            inputScreenPos = touch.position;
            inputDown = touch.phase == TouchPhase.Began;
            inputHeld = touch.phase == TouchPhase.Moved || touch.phase == TouchPhase.Stationary;
            inputUp = touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled;
        }
        else
        {
            inputScreenPos = Input.mousePosition;
            inputDown = Input.GetMouseButtonDown(0);
            inputHeld = Input.GetMouseButton(0);
            inputUp = Input.GetMouseButtonUp(0);
        }

        Vector2 worldPos = Camera.main.ScreenToWorldPoint(inputScreenPos);

        if (inputDown)
        {
            // Check if touch is near the ball (within 1 unit)
            float distToBall = Vector2.Distance(worldPos, (Vector2)transform.position);
            if (distToBall < 1.5f)
            {
                isDragging = true;
                dragStartWorld = (Vector2)transform.position;
            }
        }

        if (isDragging && inputHeld)
        {
            UpdateDragVisuals(worldPos);
        }

        if (isDragging && inputUp)
        {
            ExecuteShot(worldPos);
            isDragging = false;
        }
    }

    void UpdateDragVisuals(Vector2 currentWorld)
    {
        Vector2 ballPos = transform.position;
        Vector2 dragDelta = currentWorld - ballPos;

        // Clamp drag distance
        float dragDist = Mathf.Min(dragDelta.magnitude, maxDragDistance);
        if (dragDist < 0.1f)
        {
            HideLines();
            return;
        }

        Vector2 dragDir = dragDelta.normalized;
        Vector2 shotDir = -dragDir; // Slingshot: shot goes opposite of drag

        float power = (dragDist / maxDragDistance) * maxPower;

        // Aim line: from ball in shot direction, length proportional to power
        float aimLength = (power / maxPower) * 4f;
        Vector3 aimStart = new Vector3(ballPos.x, ballPos.y, -0.5f);
        Vector3 aimEnd = new Vector3(
            ballPos.x + shotDir.x * aimLength,
            ballPos.y + shotDir.y * aimLength,
            -0.5f
        );

        aimLine.enabled = true;
        aimLine.SetPosition(0, aimStart);
        aimLine.SetPosition(1, aimEnd);

        // Power line: from ball to drag point
        Vector3 powStart = new Vector3(ballPos.x, ballPos.y, -0.5f);
        Vector3 powEnd = new Vector3(
            ballPos.x + dragDir.x * dragDist,
            ballPos.y + dragDir.y * dragDist,
            -0.5f
        );

        powerLine.enabled = true;
        powerLine.SetPosition(0, powStart);
        powerLine.SetPosition(1, powEnd);

        // Color power line by power level
        Color powColor = Color.Lerp(
            new Color(0.5f, 1f, 0.5f, 0.5f),  // green = low power
            new Color(1f, 0.2f, 0.2f, 0.5f),   // red = max power
            power / maxPower
        );
        powerLine.startColor = powColor;
        powerLine.endColor = powColor;
    }

    void ExecuteShot(Vector2 releaseWorld)
    {
        Vector2 ballPos = transform.position;
        Vector2 dragDelta = releaseWorld - ballPos;

        float dragDist = Mathf.Min(dragDelta.magnitude, maxDragDistance);
        if (dragDist < 0.2f)
        {
            // Too short — cancel shot
            HideLines();
            return;
        }

        Vector2 shotDir = -dragDelta.normalized;
        float power = (dragDist / maxDragDistance) * maxPower;

        velocity = shotDir * power;
        ballMoving = true;
        HideLines();

        GameManager.Instance.OnShotTaken();
    }

    // --- Ball movement ---

    void UpdateMovement()
    {
        Vector2 pos = transform.position;

        HoleGenerator.TerrainType terrain = holeGenerator.GetTerrainAtWorldPos(pos);

        // Water hazard
        if (terrain == HoleGenerator.TerrainType.Water)
        {
            HandleWater();
            return;
        }

        // Apply friction
        float friction = GetFriction(terrain);
        velocity *= friction;

        // Move
        pos += velocity * Time.deltaTime * 60f;
        transform.position = new Vector3(pos.x, pos.y, -1f);

        // Track safe position
        lastSafePosition = pos;

        // Check hole
        Vector2 pinPos = holeGenerator.GetPinPosition();
        float distToPin = Vector2.Distance(pos, pinPos);
        if (distToPin < holeRadius && velocity.magnitude < maxHoleEntrySpeed)
        {
            BallInHole(pinPos);
            return;
        }

        // Check stopped
        if (velocity.magnitude < stopThreshold)
        {
            velocity = Vector2.zero;
            ballMoving = false;
            GameManager.Instance.OnBallStopped(pos);
        }
    }

    float GetFriction(HoleGenerator.TerrainType terrain)
    {
        switch (terrain)
        {
            case HoleGenerator.TerrainType.Fairway: return fairwayFriction;
            case HoleGenerator.TerrainType.Rough:   return roughFriction;
            case HoleGenerator.TerrainType.Sand:    return sandFriction;
            case HoleGenerator.TerrainType.Green:   return greenFriction;
            case HoleGenerator.TerrainType.Tee:     return fairwayFriction;
            default:                                return roughFriction;
        }
    }

    void HandleWater()
    {
        velocity = Vector2.zero;
        ballMoving = false;

        GameManager.Instance.AddPenaltyStroke();
        GameManager.Instance.uiManager.ShowWaterPenalty();

        PlaceBall(lastSafePosition);
    }

    void BallInHole(Vector2 pinPos)
    {
        velocity = Vector2.zero;
        ballMoving = false;
        transform.position = new Vector3(pinPos.x, pinPos.y, -1f);

        GameManager.Instance.OnHoleComplete();
    }

    void HideLines()
    {
        if (aimLine != null) aimLine.enabled = false;
        if (powerLine != null) powerLine.enabled = false;
    }
}
