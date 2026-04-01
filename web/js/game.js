// Main Game Loop
// Ties everything together: GPS → landmarks → 3D → physics → scoring

const Game = {
    state: 'start', // start, loading, searching, aiming, flight, settling, complete
    holeNumber: 0,
    totalStrokes: 0,
    landmarks: null,
    currentHole: null,  // { position: GPS, localPos: {x,z}, name, par, distance }
    holeLocalPos: { x: 0, z: 0 },

    SINK_RADIUS: 0.5,
    SETTLE_DELAY: 1500,

    async init() {
        UI.init();
        Controls.init();
        Visuals.init();

        // Wire controls
        Controls.onShot = (dx, dz, power, angle) => this.onShot(dx, dz, power, angle);
        Controls.onPowerChange = (p) => this.onPowerChange(p);

        // Wire next hole button
        UI.els.nextHoleBtn.addEventListener('click', () => this.nextHole());

        // Wire start button
        UI.els.startBtn.addEventListener('click', () => this.startGame());

        UI.showStartScreen();
        this.loop();
    },

    async startGame() {
        UI.hideStartScreen();
        UI.showLoading('Requesting permissions...');

        // Request orientation permission (iOS)
        await Controls.requestOrientationPermission();

        // Start camera
        await this.startCamera();

        // Start GPS
        UI.showLoading('Finding your location...');
        try {
            await GPS.start();
        } catch (err) {
            UI.showLoading('GPS failed: ' + err.message);
            console.error('GPS error:', err);
            return;
        }

        // Search landmarks
        UI.showLoading('Searching nearby landmarks...');
        this.landmarks = await Landmarks.searchNearby(GPS.currentPosition, 500);

        UI.hideLoading();
        this.startNewHole();
    },

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            document.getElementById('camera-feed').srcObject = stream;
        } catch (err) {
            console.warn('Camera not available:', err.message);
            // Game still works without camera, just no AR background
        }
    },

    startNewHole() {
        this.holeNumber++;
        BallPhysics.reset();

        // Place ball at origin (player's current position)
        const playerLocal = GPS.toLocal(GPS.currentPosition);
        BallPhysics.placeAt(playerLocal.x, 0, playerLocal.z);

        // Find hole target
        this.currentHole = this.generateHole();

        // Convert hole GPS to local coords
        const holeLocal = GPS.toLocal(this.currentHole.position);
        this.holeLocalPos = { x: holeLocal.x, z: holeLocal.z };

        // Set up 3D
        Visuals.setHolePosition(holeLocal.x, holeLocal.z);
        Visuals.updateBall(playerLocal.x, 0, playerLocal.z);

        // Auto-aim toward hole
        Controls.setAimToward(holeLocal.x, holeLocal.z, playerLocal.x, playerLocal.z);

        // Update UI
        UI.setHoleInfo(this.holeNumber, this.currentHole.name, this.currentHole.par);
        UI.setDistance(this.currentHole.distance);
        UI.setStrokes(0);
        UI.setStatus('Swipe up to hit');
        UI.showReticle();
        UI.showCompass(0, this.currentHole.distance);

        this.state = 'aiming';
        Controls.enableShooting();
    },

    generateHole() {
        // Try landmark first
        if (this.landmarks && this.landmarks.length > 0) {
            const lm = Landmarks.selectForHole(this.holeNumber, this.landmarks);
            if (lm) {
                const par = Math.min(6, Math.max(2, Math.ceil(lm.distance / 30) + 1));
                return {
                    position: lm.position,
                    name: lm.name,
                    category: lm.category,
                    par,
                    distance: lm.distance
                };
            }
        }

        // Fallback: random direction
        const dist = Math.min(100, 20 + (this.holeNumber - 1) * 5) * (0.8 + Math.random() * 0.4);
        const bearing = Math.random() * 360;
        const bearingRad = bearing * Math.PI / 180;

        const latOffset = dist * Math.cos(bearingRad) / 111320;
        const lonOffset = dist * Math.sin(bearingRad) /
            (111320 * Math.cos(GPS.currentPosition.lat * Math.PI / 180));

        const par = Math.min(6, Math.max(2, Math.ceil(dist / 30) + 1));

        return {
            position: {
                lat: GPS.currentPosition.lat + latOffset,
                lon: GPS.currentPosition.lon + lonOffset,
                alt: 0
            },
            name: this.randomHoleName(),
            category: 'random',
            par,
            distance: dist
        };
    },

    randomHoleName() {
        const names = [
            'The Sidewalk Slider', 'Curb Appeal', 'Manhole in One',
            'The Fire Hydrant', 'Storm Drain Special', 'Corner Pocket',
            'The Parking Lot', 'Traffic Cone Alley', 'The Pothole'
        ];
        return names[(this.holeNumber - 1) % names.length];
    },

    onShot(dirX, dirZ, power, angle) {
        BallPhysics.hit(dirX, dirZ, power, angle);
        this.state = 'flight';
        UI.setStatus('');
        UI.hideReticle();
        Visuals.hideAim();
        UI.vibrate(40);
    },

    onPowerChange(power) {
        UI.setPower(power);
        if (power > 0.05) {
            const dir = Controls.getAimDirection();
            Visuals.showAimLine(BallPhysics.position, dir.x, dir.z, power);
        } else {
            Visuals.hideAim();
        }
    },

    nextHole() {
        UI.hideHoleComplete();
        this.startNewHole();
    },

    loop() {
        const dt = 1 / 60;
        const time = performance.now() / 1000;

        // Physics update
        if (this.state === 'flight' || this.state === 'settling') {
            const result = BallPhysics.update(dt);

            // Check if ball reached hole
            const distToHole = BallPhysics.distanceTo(this.holeLocalPos.x, this.holeLocalPos.z);
            if (distToHole < this.SINK_RADIUS &&
                (BallPhysics.state === 'rolling' || BallPhysics.state === 'resting')) {
                BallPhysics.sink();
                this.onHoleComplete();
            }
            // Ball came to rest
            else if (result === 'resting') {
                this.state = 'settling';
                setTimeout(() => {
                    if (this.state === 'settling') {
                        this.state = 'aiming';
                        Controls.enableShooting();
                        UI.setStatus('Swipe up to hit');
                        UI.showReticle();

                        // Re-aim toward hole
                        Controls.setAimToward(
                            this.holeLocalPos.x, this.holeLocalPos.z,
                            BallPhysics.position.x, BallPhysics.position.z
                        );
                    }
                }, this.SETTLE_DELAY);
            }
        }

        // Update 3D visuals
        Visuals.updateBall(BallPhysics.position.x, BallPhysics.position.y, BallPhysics.position.z);
        Visuals.updateFlag(time);

        const distToHole = BallPhysics.distanceTo(this.holeLocalPos.x, this.holeLocalPos.z);
        Visuals.updatePulse(time, distToHole);
        Visuals.updateCamera(
            BallPhysics.position,
            { x: this.holeLocalPos.x, y: 0, z: this.holeLocalPos.z },
            BallPhysics.state
        );

        // Update UI
        UI.setDistance(distToHole);
        UI.setStrokes(BallPhysics.shotCount);

        // Compass bearing to hole
        if (this.currentHole) {
            const dx = this.holeLocalPos.x - BallPhysics.position.x;
            const dz = this.holeLocalPos.z - BallPhysics.position.z;
            const bearing = Math.atan2(dx, dz) * 180 / Math.PI;
            UI.showCompass(bearing, distToHole);
        }

        Visuals.render();
        requestAnimationFrame(() => this.loop());
    },

    onHoleComplete() {
        this.state = 'complete';
        Controls.disableShooting();

        const diff = BallPhysics.shotCount - this.currentHole.par;
        let scoreName;
        if (diff <= -3) scoreName = 'Albatross';
        else if (diff === -2) scoreName = 'Eagle';
        else if (diff === -1) scoreName = 'Birdie';
        else if (diff === 0) scoreName = 'Par';
        else if (diff === 1) scoreName = 'Bogey';
        else if (diff === 2) scoreName = 'Double Bogey';
        else if (diff === 3) scoreName = 'Triple Bogey';
        else scoreName = `+${diff}`;

        this.totalStrokes += BallPhysics.shotCount;

        UI.vibrate(80);
        UI.hideReticle();
        UI.hideCompass();

        UI.showHoleComplete({
            scoreName,
            strokes: BallPhysics.shotCount,
            par: this.currentHole.par,
            totalStrokes: this.totalStrokes,
            distance: this.currentHole.distance,
            landmarkName: this.currentHole.name
        });
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => Game.init());
