// Slingshot Touch Controls
// Pull back from ball to aim and set power, release to shoot

const Controls = {
    // Slingshot state
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragCurrentX: 0,
    dragCurrentY: 0,
    swipePower: 0,       // 0-1
    aimDirX: 0,          // shot direction X (world)
    aimDirZ: -1,         // shot direction Z (world) — default toward hole
    canShoot: false,

    // References set by game
    onShot: null,        // callback(dirX, dirZ, power)
    onAimChange: null,   // callback(dirX, dirZ, power) — called during drag for preview

    // Max drag distance in screen pixels for full power
    MAX_DRAG_PX: 200,

    // Pinch-to-zoom state
    isPinching: false,
    pinchStartDist: 0,
    pinchStartZoom: 1.0,

    // We need access to the Three.js camera to convert screen drag into world direction.
    camera: null,
    getBallPos: null,    // function returning {x, y, z}
    getHolePos: null,    // function returning {x, z}

    init() {
        const canvas = document.getElementById('game-canvas');

        canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', () => this._onTouchCancel());

        // Mouse support for desktop testing
        canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoom = (Visuals.zoomTarget || 1.0) + e.deltaY * 0.001;
            Visuals.setZoom(zoom);
        }, { passive: false });
    },

    enableShooting() {
        this.canShoot = true;
        this.swipePower = 0;
    },

    disableShooting() {
        this.canShoot = false;
        this.swipePower = 0;
        this.isDragging = false;
    },

    // Set initial aim direction toward the hole (called by Game when a new hole starts
    // or the ball comes to rest). No orientation permission needed.
    setAimToward(holeX, holeZ, ballX, ballZ) {
        const dx = holeX - ballX;
        const dz = holeZ - ballZ;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        this.aimDirX = dx / len;
        this.aimDirZ = dz / len;
    },

    // Return current aim direction (used by Game.onPowerChange for aim line preview)
    getAimDirection() {
        return { x: this.aimDirX, z: this.aimDirZ };
    },

    // No-op: orientation permission is not needed for slingshot controls.
    // Kept so game.js doesn't crash on the call.
    async requestOrientationPermission() {
        // Not needed for pull-back aiming
    },

    // Convert a screen-space drag vector into a world-space shot direction.
    // The player drags BACKWARD (away from hole), so we reverse the direction.
    // We project the drag onto the ground plane using the camera.
    _screenDragToWorldDir(dx, dy) {
        if (!this.camera) {
            // Fallback: treat screen up as world -Z
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            return { x: -dx / len, z: dy / len };
        }

        // Use Three.js to unproject two points on the ground plane
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Center of screen and center + drag offset, both as NDC
        const centerNDC = new THREE.Vector2(0, 0);
        const dragNDC = new THREE.Vector2(
            (dx / w) * 2,
            -(dy / h) * 2
        );

        const raycaster = new THREE.Raycaster();
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        // Ray from screen center
        raycaster.setFromCamera(centerNDC, this.camera);
        const p0 = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, p0);

        // Ray from drag-offset point
        raycaster.setFromCamera(dragNDC, this.camera);
        const p1 = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, p1);

        if (!p0 || !p1) {
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            return { x: -dx / len, z: dy / len };
        }

        // The drag vector in world space (on the ground)
        const worldDx = p1.x - p0.x;
        const worldDz = p1.z - p0.z;

        // Reverse it: player pulls back, ball goes forward
        const rdx = -worldDx;
        const rdz = -worldDz;

        const len = Math.sqrt(rdx * rdx + rdz * rdz) || 1;
        return { x: rdx / len, z: rdz / len };
    },

    _startDrag(screenX, screenY) {
        if (!this.canShoot) return;
        this.dragStartX = screenX;
        this.dragStartY = screenY;
        this.dragCurrentX = screenX;
        this.dragCurrentY = screenY;
        this.isDragging = true;
        this.swipePower = 0;
    },

    _updateDrag(screenX, screenY) {
        if (!this.isDragging || !this.canShoot) return;
        this.dragCurrentX = screenX;
        this.dragCurrentY = screenY;

        const dx = this.dragCurrentX - this.dragStartX;
        const dy = this.dragCurrentY - this.dragStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.swipePower = Math.min(1, dist / this.MAX_DRAG_PX);

        // Compute world direction from the screen drag
        if (dist > 5) {
            const dir = this._screenDragToWorldDir(dx, dy);
            this.aimDirX = dir.x;
            this.aimDirZ = dir.z;
        }

        if (this.onAimChange) {
            this.onAimChange(this.aimDirX, this.aimDirZ, this.swipePower);
        }
    },

    _endDrag() {
        if (!this.isDragging || !this.canShoot) return;

        if (this.swipePower > 0.05) {
            if (this.onShot) {
                this.onShot(this.aimDirX, this.aimDirZ, this.swipePower);
            }
            this.canShoot = false;
        }

        this.isDragging = false;
        this.swipePower = 0;
        if (this.onAimChange) {
            this.onAimChange(0, 0, 0);
        }
    },

    _cancelDrag() {
        this.isDragging = false;
        this.swipePower = 0;
        if (this.onAimChange) {
            this.onAimChange(0, 0, 0);
        }
    },

    // --- Touch handlers ---
    _onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 2) {
            // Start pinch-to-zoom
            this._cancelDrag();
            this.isPinching = true;
            this.pinchStartDist = this._pinchDist(e.touches);
            this.pinchStartZoom = Visuals.zoomTarget || 1.0;
            return;
        }
        if (e.touches.length === 1 && !this.isPinching) {
            const touch = e.touches[0];
            this._startDrag(touch.clientX, touch.clientY);
        }
    },

    _onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 2 && this.isPinching) {
            const dist = this._pinchDist(e.touches);
            const ratio = this.pinchStartDist / dist; // spread fingers = zoom in (lower height)
            Visuals.setZoom(this.pinchStartZoom * ratio);
            return;
        }
        if (e.touches.length === 1 && !this.isPinching) {
            const touch = e.touches[0];
            this._updateDrag(touch.clientX, touch.clientY);
        }
    },

    _onTouchEnd(e) {
        e.preventDefault();
        if (e.touches.length < 2) {
            this.isPinching = false;
        }
        if (e.touches.length === 0) {
            this._endDrag();
        }
    },

    _onTouchCancel() {
        this.isPinching = false;
        this._cancelDrag();
    },

    _pinchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy) || 1;
    },

    // --- Mouse handlers (desktop testing) ---
    _onMouseDown(e) {
        this._startDrag(e.clientX, e.clientY);
    },

    _onMouseMove(e) {
        this._updateDrag(e.clientX, e.clientY);
    },

    _onMouseUp(e) {
        this._endDrag();
    }
};
