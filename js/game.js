// Main Game Loop — Arcade Street Golf
// Holes scaled to 150-600 yards in the direction of real landmarks

const Game = {
    state: 'start', // start, loading, intro, aiming, flight, settling, complete
    holeNumber: 0,
    totalStrokes: 0,
    currentHole: null,
    holeLocalPos: { x: 0, z: 0 },
    ballStart: { x: 0, z: 0 },
    university: null,
    landmarks: null,

    SINK_RADIUS: 5, // yards
    SETTLE_DELAY: 1200,

    initialized: false,

    // Hole distances in yards (150-600)
    HOLE_DISTANCES: [380, 165, 540, 195, 420, 150, 490, 210, 600,
                     350, 175, 520, 200, 440, 160, 480, 230, 560],

    async init() {
        try {
            UI.init();
            Controls.init();
            Visuals.init();

            Controls.onShot = (dx, dz, power) => this.onShot(dx, dz, power);
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
            this.init();
            if (!this.initialized) return;
        }
        try {
            UI.hideStartScreen();
            UI.showLoading('Requesting permissions...');

            try { await Controls.requestOrientationPermission(); }
            catch (e) { console.warn('Orientation skipped:', e); }

            UI.showLoading('Finding your location...');
            try {
                await GPS.start();
            } catch (err) {
                console.warn('GPS failed, using Chapel Hill:', err.message);
                GPS.startPosition = { lat: 35.9080, lon: -79.0520, alt: 0 };
                GPS.currentPosition = { ...GPS.startPosition };
                GPS.hasFix = true;
            }

            UI.showLoading('Finding nearest university...');
            try {
                this.university = await Landmarks.findNearestUniversity(GPS.currentPosition);
            } catch (err) { console.warn('University search failed:', err.message); }

            if (!this.university) {
                this.university = {
                    name: 'UNC Chapel Hill',
                    position: { lat: 35.9101, lon: -79.0510, alt: 0 },
                    distance: GPS.distanceBetween(GPS.currentPosition, { lat: 35.9101, lon: -79.0510 })
                };
            }

            UI.showLoading('Finding landmarks at ' + this.university.name + '...');
            try {
                this.landmarks = await Landmarks.searchNearUniversity(
                    this.university.position, 2000
                );
            } catch (err) {
                console.warn('Landmark search failed:', err);
                this.landmarks = null;
            }

            UI.hideLoading();
            UI.setUniversityName(this.university.name);
            this.holeNumber = 0;
            this.totalStrokes = 0;
            this.startNewHole();
        } catch (err) {
            console.error('startGame error:', err);
            UI.showLoading('Error: ' + err.message);
            var d = document.getElementById('debug');
            if (d) d.textContent = err.message;
        }
    },

    startNewHole() {
        this.holeNumber++;
        BallPhysics.reset();

        // Ball starts at origin (0,0)
        this.ballStart = { x: 0, z: 0 };
        BallPhysics.placeAt(0, 0, 0);

        // Generate hole — scaled to golf distance in direction of landmark
        this.currentHole = this.generateHole();
        this.holeLocalPos = { x: this.currentHole.holeX, z: this.currentHole.holeZ };

        // Select initial club
        const distYards = this.currentHole.distYards;
        BallPhysics.currentClub = BallPhysics.selectClub(distYards);

        // Set up 3D
        Visuals.setHolePosition(this.holeLocalPos.x, this.holeLocalPos.z);
        Visuals.updateBall(0, 0, 0);
        Visuals.updateCourseLine(
            { x: 0, z: 0 },
            { x: this.holeLocalPos.x, z: this.holeLocalPos.z }
        );
        Visuals.setHoleLabel(this.currentHole.name);

        // Auto-aim toward hole
        Controls.setAimToward(this.holeLocalPos.x, this.holeLocalPos.z, 0, 0);

        // Update UI
        UI.setHoleInfo(this.holeNumber, this.currentHole.name, this.currentHole.par);
        UI.setDistanceYards(distYards);
        UI.setStrokes(0);
        UI.setClub(BallPhysics.currentClub);

        // Intro animation
        this.state = 'intro';
        UI.setStatus('');
        Visuals.startIntroAnimation(
            { x: 0, z: 0 },
            { x: this.holeLocalPos.x, z: this.holeLocalPos.z }
        );
    },

    generateHole() {
        // Pick a target distance (yards)
        const distIndex = (this.holeNumber - 1) % this.HOLE_DISTANCES.length;
        const distYards = this.HOLE_DISTANCES[distIndex];

        // Calculate par from yards
        let par;
        if (distYards <= 200) par = 3;
        else if (distYards <= 450) par = 4;
        else par = 5;

        // Get bearing to a real landmark
        let bearing, name;
        if (this.landmarks && this.landmarks.length > 0) {
            const lm = this.landmarks[(this.holeNumber - 1) % this.landmarks.length];
            // Bearing from player to landmark
            const lmLocal = GPS.toLocal(lm.position);
            const playerLocal = GPS.toLocal(GPS.currentPosition);
            bearing = Math.atan2(
                lmLocal.x - playerLocal.x,
                lmLocal.z - playerLocal.z
            );
            name = lm.name;
        } else {
            // Random bearing
            bearing = ((this.holeNumber * 137.5) % 360) * Math.PI / 180;
            name = this.randomHoleName();
        }

        // Place hole at golf distance in the landmark's direction
        const holeX = Math.sin(bearing) * distYards;
        const holeZ = Math.cos(bearing) * distYards;

        return { holeX, holeZ, distYards, par, name, bearing };
    },

    randomHoleName() {
        const names = [
            'The Sidewalk Slider', 'Curb Appeal', 'Manhole in One',
            'The Fire Hydrant', 'Storm Drain Special', 'Corner Pocket',
            'The Parking Lot', 'Traffic Cone Alley', 'The Pothole'
        ];
        return names[(this.holeNumber - 1) % names.length];
    },

    onShot(dirX, dirZ, swipePower) {
        BallPhysics.hit(dirX, dirZ, swipePower);
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
            Visuals.showAimLine(BallPhysics.position, dir.x, dir.z, power,
                BallPhysics.CLUBS[BallPhysics.currentClub]);
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
                UI.setStatus('SWIPE UP TO HIT');
                UI.showReticle();
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

                        // Auto-select club for remaining distance
                        const remaining = BallPhysics.distanceTo(
                            this.holeLocalPos.x, this.holeLocalPos.z
                        );
                        BallPhysics.currentClub = BallPhysics.selectClub(remaining);
                        UI.setClub(BallPhysics.currentClub);

                        Controls.enableShooting();
                        UI.setStatus('SWIPE UP TO HIT');
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

        if (this.currentHole) {
            Visuals.updateCourseLine(
                { x: BallPhysics.position.x, z: BallPhysics.position.z },
                { x: this.holeLocalPos.x, z: this.holeLocalPos.z }
            );
        }

        // UI distance in yards
        UI.setDistanceYards(Math.round(distToHole));
        UI.setStrokes(BallPhysics.shotCount);

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

        UI.showHoleComplete({
            scoreName,
            strokes: BallPhysics.shotCount,
            par: this.currentHole.par,
            totalStrokes: this.totalStrokes,
            distance: this.currentHole.distYards,
            landmarkName: this.currentHole.name
        });
    }
};

document.addEventListener('DOMContentLoaded', () => Game.init());
