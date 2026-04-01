// Touch Controls
// Swipe to hit, device orientation for aim

const Controls = {
    aimAngle: 0,         // radians, from device compass/orientation
    swipePower: 0,       // 0-1
    isSwiping: false,
    swipeStartY: 0,
    canShoot: false,

    // Device orientation
    deviceAlpha: 0,      // compass heading
    deviceBeta: 0,       // tilt front-back
    deviceGamma: 0,      // tilt left-right
    hasOrientation: false,

    onShot: null,        // callback(dirX, dirZ, power)
    onPowerChange: null, // callback(power)

    init() {
        const body = document.body;

        body.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        body.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        body.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        body.addEventListener('touchcancel', () => this._onTouchCancel());

        // Device orientation for aim direction
        if (typeof DeviceOrientationEvent !== 'undefined') {
            // iOS 13+ requires permission
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                // Permission requested on user gesture (start button)
            } else {
                window.addEventListener('deviceorientation', (e) => this._onOrientation(e));
            }
        }
    },

    async requestOrientationPermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const result = await DeviceOrientationEvent.requestPermission();
                if (result === 'granted') {
                    window.addEventListener('deviceorientation', (e) => this._onOrientation(e));
                    return true;
                }
            } catch (e) {
                console.warn('Orientation permission denied:', e);
            }
            return false;
        }
        return true; // Not needed on Android
    },

    enableShooting() {
        this.canShoot = true;
        this.swipePower = 0;
    },

    disableShooting() {
        this.canShoot = false;
        this.swipePower = 0;
    },

    getAimDirection() {
        // Use device compass heading if available
        if (this.hasOrientation) {
            const rad = (this.deviceAlpha || 0) * Math.PI / 180;
            return { x: Math.sin(rad), z: Math.cos(rad) };
        }
        // Fallback: use stored aim angle
        return {
            x: Math.sin(this.aimAngle),
            z: Math.cos(this.aimAngle)
        };
    },

    setAimToward(targetX, targetZ, ballX, ballZ) {
        const dx = targetX - ballX;
        const dz = targetZ - ballZ;
        this.aimAngle = Math.atan2(dx, dz);
    },

    _onTouchStart(e) {
        if (!this.canShoot) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.swipeStartY = touch.clientY;
        this.isSwiping = true;
        this.swipePower = 0;
    },

    _onTouchMove(e) {
        if (!this.isSwiping || !this.canShoot) return;
        e.preventDefault();
        const touch = e.touches[0];
        const dy = this.swipeStartY - touch.clientY; // swipe up = positive
        this.swipePower = Math.max(0, Math.min(1, dy / 300));
        if (this.onPowerChange) this.onPowerChange(this.swipePower);
    },

    _onTouchEnd(e) {
        if (!this.isSwiping || !this.canShoot) return;
        e.preventDefault();

        if (this.swipePower > 0.05) {
            const dir = this.getAimDirection();

            if (this.onShot) {
                this.onShot(dir.x, dir.z, this.swipePower);
            }

            this.canShoot = false;
        }

        this.isSwiping = false;
        this.swipePower = 0;
        if (this.onPowerChange) this.onPowerChange(0);
    },

    _onTouchCancel() {
        this.isSwiping = false;
        this.swipePower = 0;
        if (this.onPowerChange) this.onPowerChange(0);
    },

    _onOrientation(e) {
        this.hasOrientation = true;
        this.deviceAlpha = e.alpha || 0;
        this.deviceBeta = e.beta || 0;
        this.deviceGamma = e.gamma || 0;
    }
};
