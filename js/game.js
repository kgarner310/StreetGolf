// Main Game Loop — Arcade Street Golf
// GPS → find nearest university → 3D arcade view → physics → scoring

const Game = {
    state: 'start', // start, loading, searching, intro, aiming, flight, settling, complete
    holeNumber: 0,
    totalStrokes: 0,
    currentHole: null,
    holeLocalPos: { x: 0, z: 0 },
    university: null, // nearest university/college

    SINK_RADIUS: 3,
    SETTLE_DELAY: 1500,

    initialized: false,

    async init() {
        try {
            UI.init();
            Controls.init();
            Visuals.init(); // sets Visuals.ready; game works even if 3D fails

            Controls.onShot = (dx, dz, power, angle) => this.onShot(dx, dz, power, angle);
            Controls.onPowerChange = (p) => this.onPowerChange(p);

            UI.els.nextHoleBtn.addEventListener('click', () => this.nextHole());
            UI.els.startBtn.addEventListener('click', () => {
                this.startGame().catch(e => {
                    var d = document.getElementById('debug');
                    if (d) d.textContent = e.message;
                });
            });

            this.initialized = true;
            UI.showStartScreen();
            this.loop();
        } catch (e) {
            console.error('Init error:', e);
            var d = document.getElementById('debug');
            if (d) d.textContent = 'Init: ' + e.message;
        }
    },

    async startGame() {
        if (!this.initialized) {
            // init() failed or hasn't run yet — try init first
            this.init();
            if (!this.initialized) return;
        }
        try {
            UI.hideStartScreen();
            UI.showLoading('Requesting permissions...');

            try {
                await Controls.requestOrientationPermission();
            } catch (e) {
                console.warn('Orientation permission skipped:', e);
            }

            // No camera needed — arcade top-down view
            // Start GPS
            UI.showLoading('Finding your location...');
            try {
                await GPS.start();
            } catch (err) {
                console.warn('GPS failed, using Chapel Hill:', err.message);
                // Default: UNC Chapel Hill campus
                GPS.startPosition = { lat: 35.9080, lon: -79.0520, alt: 0 };
                GPS.currentPosition = { ...GPS.startPosition };
                GPS.hasFix = true;
            }

            // Find nearest university
            UI.showLoading('Finding nearest university...');
            try {
                this.university = await Landmarks.findNearestUniversity(GPS.currentPosition);
            } catch (err) {
                console.warn('University search failed:', err.message);
            }

            if (!this.university) {
                // Fallback: default university
                this.university = {
                    name: 'UNC Chapel Hill',
                    position: { lat: 35.9101, lon: -79.0510, alt: 0 },
                    distance: GPS.distanceBetween(GPS.currentPosition,
                        { lat: 35.9101, lon: -79.0510 })
                };
            }

            // Search for POIs near the university to use as holes
            UI.showLoading('Setting up ' + this.university.name + '...');
            try {
                this.landmarks = await Landmarks.searchNearUniversity(
                    this.university.position, 800
                );
            } catch (err) {
                console.warn('Landmark search failed:', err);
                this.landmarks = null;
            }

            UI.hideLoading();

            // Update start info
            UI.setUniversityName(this.university.name);
            this.holeNumber = 0; // Reset before first hole
            this.totalStrokes = 0;
            this.startNewHole();
        } catch (err) {
            console.error('startGame error:', err);
            UI.showLoading('Error: ' + err.message);
            // Show on debug element too
            var d = document.getElementById('debug');
            if (d) d.textContent = err.message;
        }
    },

    startNewHole() {
        this.holeNumber++;
        BallPhysics.reset();

        // Place ball at player position
        const playerLocal = GPS.toLocal(GPS.currentPosition);
        BallPhysics.placeAt(playerLocal.x, 0, playerLocal.z);

        // Generate hole
        this.currentHole = this.generateHole();

        // Convert hole GPS to local coords
        const holeLocal = GPS.toLocal(this.currentHole.position);
        this.holeLocalPos = { x: holeLocal.x, z: holeLocal.z };

        // Set up 3D
        Visuals.setHolePosition(holeLocal.x, holeLocal.z);
        Visuals.updateBall(playerLocal.x, 0, playerLocal.z);
        Visuals.updateCourseLine(
            { x: playerLocal.x, z: playerLocal.z },
            { x: holeLocal.x, z: holeLocal.z }
        );

        // Auto-aim toward hole
        Controls.setAimToward(holeLocal.x, holeLocal.z, playerLocal.x, playerLocal.z);

        // Update UI
        UI.setHoleInfo(this.holeNumber, this.currentHole.name, this.currentHole.par);
        UI.setDistance(this.currentHole.distance);
        UI.setStrokes(0);

        // Start intro animation
        this.state = 'intro';
        UI.setStatus('');
        Visuals.startIntroAnimation(
            { x: playerLocal.x, z: playerLocal.z },
            { x: holeLocal.x, z: holeLocal.z }
        );
    },

    generateHole() {
        // Use the university itself as the "green"
        // The hole target is the university center or a specific campus landmark
        if (this.landmarks && this.landmarks.length > 0) {
            // Pick a campus landmark as the specific hole
            const lm = this.landmarks[
                (this.holeNumber - 1) % this.landmarks.length
            ];
            const dist = GPS.distanceBetween(GPS.currentPosition, lm.position);
            const par = Math.min(7, Math.max(3, Math.ceil(dist / 40) + 1));
            return {
                position: lm.position,
                name: lm.name,
                category: lm.category,
                par,
                distance: dist
            };
        }

        // Fallback: aim at the university center
        const dist = this.university
            ? GPS.distanceBetween(GPS.currentPosition, this.university.position)
            : 200;
        const par = Math.min(7, Math.max(3, Math.ceil(dist / 40) + 1));

        return {
            position: this.university
                ? this.university.position
                : {
                    lat: GPS.currentPosition.lat + 0.002,
                    lon: GPS.currentPosition.lon + 0.001,
                    alt: 0
                },
            name: this.university ? this.university.name : 'The Green',
            category: 'university',
            par,
            distance: dist
        };
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

        // Intro animation
        if (this.state === 'intro') {
            const done = Visuals.updateIntroAnimation(dt);
            if (done) {
                this.state = 'aiming';
                Controls.enableShooting();
                UI.setStatus('Swipe up to hit');
                UI.showReticle();
                UI.showCompass(0, this.currentHole.distance);
            }
        }

        // Physics update
        if (this.state === 'flight' || this.state === 'settling') {
            const result = BallPhysics.update(dt);

            const distToHole = BallPhysics.distanceTo(this.holeLocalPos.x, this.holeLocalPos.z);
            if (distToHole < this.SINK_RADIUS &&
                (BallPhysics.state === 'rolling' || BallPhysics.state === 'resting')) {
                BallPhysics.sink();
                this.onHoleComplete();
            } else if (result === 'resting') {
                this.state = 'settling';
                setTimeout(() => {
                    if (this.state === 'settling') {
                        this.state = 'aiming';
                        Controls.enableShooting();
                        UI.setStatus('Swipe up to hit');
                        UI.showReticle();

                        Controls.setAimToward(
                            this.holeLocalPos.x, this.holeLocalPos.z,
                            BallPhysics.position.x, BallPhysics.position.z
                        );
                    }
                }, this.SETTLE_DELAY);
            }
        }

        // Update 3D
        Visuals.updateBall(BallPhysics.position.x, BallPhysics.position.y, BallPhysics.position.z);
        Visuals.updateFlag(time);

        const distToHole = BallPhysics.distanceTo(this.holeLocalPos.x, this.holeLocalPos.z);
        Visuals.updatePulse(time, distToHole);

        if (this.state !== 'intro') {
            Visuals.updateCamera(
                BallPhysics.position,
                { x: this.holeLocalPos.x, y: 0, z: this.holeLocalPos.z },
                BallPhysics.state
            );
        }

        // Update course line
        if (this.currentHole) {
            Visuals.updateCourseLine(
                { x: BallPhysics.position.x, z: BallPhysics.position.z },
                { x: this.holeLocalPos.x, z: this.holeLocalPos.z }
            );
        }

        // UI updates
        UI.setDistance(distToHole);
        UI.setStrokes(BallPhysics.shotCount);

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
