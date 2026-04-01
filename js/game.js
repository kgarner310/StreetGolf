// Main Game Loop — Arcade Street Golf
// Holes scaled to 150-600 yards in direction of real landmarks
// Fairway follows actual road routes from OSM

const Game = {
    state: 'start', // start, loading, intro, aiming, flight, settling, complete
    holeNumber: 0,
    totalStrokes: 0,
    currentHole: null,
    holeLocalPos: { x: 0, z: 0 },
    university: null,
    landmarks: null,

    SINK_RADIUS: 5,
    SETTLE_DELAY: 1200,
    initialized: false,

    HOLE_DISTANCES: [380, 165, 540, 195, 420, 150, 490, 210, 600,
                     350, 175, 520, 200, 440, 160, 480, 230, 560],

    async init() {
        try {
            console.log('StreetGolf v20260401b');
            UI.init();
            Controls.init();
            Visuals.init();

            // Persistent debug overlay during gameplay
            this._debugEl = document.createElement('div');
            this._debugEl.style.cssText = 'position:fixed;bottom:60px;left:5px;font-size:10px;color:#ff0;z-index:99;background:rgba(0,0,0,0.7);padding:4px 6px;border-radius:4px;pointer-events:none;';
            document.body.appendChild(this._debugEl);
            this._debugEl.textContent = 'v20260401b | 3D:' + (Visuals.ready ? 'OK' : 'FAIL') +
                ' | cam:' + (Visuals.camera ? 'OK' : 'NULL') +
                ' | renderer:' + (Visuals.renderer ? 'OK' : 'NULL');

            if (!Visuals.ready) {
                var d = document.getElementById('debug');
                if (d) d.textContent = 'WARNING: 3D engine failed to start';
            }

            // Wire slingshot controls
            Controls.onShot = (dx, dz, power) => this.onShot(dx, dz, power);
            Controls.onAimChange = (dx, dz, power) => this.onAimChange(dx, dz, power);

            // Give controls access to Three.js camera for screen-to-world projection
            Controls.camera = Visuals.camera;
            Controls.getBallPos = () => BallPhysics.position;
            Controls.getHolePos = () => this.holeLocalPos;

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
                    this.university.position, 5000
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
        BallPhysics.placeAt(0, 0, 0);

        // Reset zoom for new hole
        Visuals.setZoom(1.0);

        // Generate hole
        this.currentHole = this.generateHole();
        this.holeLocalPos = { x: this.currentHole.holeX, z: this.currentHole.holeZ };

        // Select club
        const distYards = this.currentHole.distYards;
        BallPhysics.currentClub = BallPhysics.selectClub(distYards);

        // Set up 3D scene
        Visuals.setHolePosition(this.holeLocalPos.x, this.holeLocalPos.z);
        Visuals.updateBall(0, 0, 0);
        Visuals.updateCourseLine(
            { x: 0, z: 0 },
            { x: this.holeLocalPos.x, z: this.holeLocalPos.z }
        );
        Visuals.setHoleLabel(this.currentHole.name);

        // Fetch driving route and draw as fairway
        this.fetchAndDrawRoute();

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

    async fetchAndDrawRoute() {
        if (!this.currentHole.landmarkGPS || !GPS.currentPosition) {
            Visuals.drawStraightFairway(0, 0, this.holeLocalPos.x, this.holeLocalPos.z);
            return;
        }

        try {
            const from = GPS.currentPosition;
            const to = this.currentHole.landmarkGPS;
            const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;

            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.routes || data.routes.length === 0) throw new Error('No route');

            const coords = data.routes[0].geometry.coordinates;
            // Convert GPS coordinates to game-world yards
            // coords are [lon, lat] pairs
            const routePoints = this.convertRouteToGameCoords(coords);
            Visuals.drawRouteFairway(routePoints);
        } catch (err) {
            console.warn('Route fetch failed:', err.message);
            Visuals.drawStraightFairway(0, 0, this.holeLocalPos.x, this.holeLocalPos.z);
        }
    },

    convertRouteToGameCoords(coords) {
        // Convert GPS route coords to local meters, then scale to match game hole distance
        const localPoints = coords.map(c => {
            const gps = { lat: c[1], lon: c[0], alt: 0 };
            return GPS.toLocal(gps);
        });

        if (localPoints.length < 2) return [];

        // Route in meters from GPS origin
        // Scale so the route endpoints match ball (0,0) and hole position
        const routeStart = localPoints[0];
        const routeEnd = localPoints[localPoints.length - 1];

        // Real distance of route (meters)
        const realDx = routeEnd.x - routeStart.x;
        const realDz = routeEnd.z - routeStart.z;
        const realDist = Math.sqrt(realDx * realDx + realDz * realDz) || 1;

        // Game distance (yards)
        const gameDist = Math.sqrt(
            this.holeLocalPos.x * this.holeLocalPos.x +
            this.holeLocalPos.z * this.holeLocalPos.z
        ) || 1;

        const scale = gameDist / realDist;

        // Translate so route starts at (0,0) and scale
        return localPoints.map(p => ({
            x: (p.x - routeStart.x) * scale,
            z: (p.z - routeStart.z) * scale
        }));
    },

    generateHole() {
        const distIndex = (this.holeNumber - 1) % this.HOLE_DISTANCES.length;
        const distYards = this.HOLE_DISTANCES[distIndex];

        let par;
        if (distYards <= 200) par = 3;
        else if (distYards <= 450) par = 4;
        else par = 5;

        let bearing, name, landmarkGPS;
        if (this.landmarks && this.landmarks.length > 0) {
            const lm = this.landmarks[(this.holeNumber - 1) % this.landmarks.length];
            const lmLocal = GPS.toLocal(lm.position);
            const playerLocal = GPS.toLocal(GPS.currentPosition);
            bearing = Math.atan2(lmLocal.x - playerLocal.x, lmLocal.z - playerLocal.z);
            name = lm.name;
            landmarkGPS = lm.position;
        } else {
            bearing = ((this.holeNumber * 137.5) % 360) * Math.PI / 180;
            name = this.randomHoleName();
            landmarkGPS = null;
        }

        const holeX = Math.sin(bearing) * distYards;
        const holeZ = Math.cos(bearing) * distYards;

        return { holeX, holeZ, distYards, par, name, bearing, landmarkGPS };
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
        Visuals.hideAim();
        UI.vibrate(40);
    },

    onAimChange(dirX, dirZ, power) {
        UI.setPower(power);
        if (power > 0.03) {
            Visuals.showAimLine(BallPhysics.position, dirX, dirZ, power,
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
                UI.setStatus('PULL BACK TO AIM');
            }
        }

        // Physics
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

                        const remaining = BallPhysics.distanceTo(
                            this.holeLocalPos.x, this.holeLocalPos.z
                        );
                        BallPhysics.currentClub = BallPhysics.selectClub(remaining);
                        UI.setClub(BallPhysics.currentClub);

                        Controls.enableShooting();
                        Controls.setAimToward(
                            this.holeLocalPos.x, this.holeLocalPos.z,
                            BallPhysics.position.x, BallPhysics.position.z
                        );
                        UI.setStatus('PULL BACK TO AIM');
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

        UI.setDistanceYards(Math.round(distToHole));
        UI.setStrokes(BallPhysics.shotCount);

        // Update debug overlay every 60 frames
        this._debugCounter = (this._debugCounter || 0) + 1;
        if (this._debugEl && this._debugCounter % 60 === 0) {
            const cp = Visuals.camera ? Visuals.camera.position : null;
            this._debugEl.textContent = 'v20260401b | 3D:' + (Visuals.ready ? 'OK' : 'FAIL') +
                ' | st:' + this.state +
                (cp ? ' | cam:' + Math.round(cp.x) + ',' + Math.round(cp.y) + ',' + Math.round(cp.z) : '') +
                ' | hole:' + Math.round(this.holeLocalPos.x) + ',' + Math.round(this.holeLocalPos.z) +
                ' | route:' + (Visuals.routeFairwayGroup ? Visuals.routeFairwayGroup.children.length : 'none');
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
