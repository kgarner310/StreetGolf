// Arcade-style 3D Visuals using Three.js
// Top-down zoomed-out view of UNC Chapel Hill campus

const Visuals = {
    scene: null,
    camera: null,
    renderer: null,

    ball: null,
    ballShadow: null,
    ballGlow: null,
    ballTrail: [],
    playerMarker: null,
    holeGroup: null,
    oldWellGroup: null,
    green: null,
    flagPole: null,
    flagCloth: null,
    pulseRing: null,
    aimLine: null,
    landingMarker: null,
    courseLine: null,
    campusGround: null,
    fairway: null,
    buildings: [],
    trees: [],

    // Camera animation
    camTarget: { x: 0, y: 100, z: 0 },
    camLookAt: { x: 0, y: 0, z: 0 },
    introAnimating: false,
    introPhase: 0,
    introTimer: 0,

    ready: false,

    init() {
        try {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) { console.error('No canvas'); return; }

            if (typeof THREE === 'undefined') { console.error('Three.js not loaded'); return; }

            this.scene = new THREE.Scene();
            this.scene.fog = new THREE.FogExp2(0x1a2a1a, 0.0015);

            // Camera
            this.camera = new THREE.PerspectiveCamera(
                50, window.innerWidth / window.innerHeight, 0.1, 2000
            );
            this.camera.position.set(0, 300, 150);
            this.camera.lookAt(0, 0, 0);

            // Renderer — try without antialias first on mobile
            try {
                this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            } catch (e) {
                this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
            }
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setClearColor(0x0a1a0a, 1);

            // Lighting
            this.scene.add(new THREE.AmbientLight(0x445544, 1.0));
            const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
            sun.position.set(100, 200, 50);
            this.scene.add(sun);
            this.scene.add(new THREE.DirectionalLight(0x4488ff, 0.3));

            // Create world — each wrapped so one failure doesn't kill all
            try { this._createCampusGround(); } catch(e) { console.warn('ground:', e); }
            try { this._createBall(); } catch(e) { console.warn('ball:', e); }
            try { this._createHole(); } catch(e) { console.warn('hole:', e); }
            try { this._createAimLine(); } catch(e) { console.warn('aim:', e); }
            try { this._createCourseLine(); } catch(e) { console.warn('line:', e); }

            window.addEventListener('resize', () => this._onResize());
            this.ready = true;
        } catch (e) {
            console.error('Visuals.init failed:', e);
            this.ready = false;
        }
    },

    _createCampusGround() {
        // Main grass ground — large area
        const groundGeo = new THREE.PlaneGeometry(1200, 1200, 20, 20);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x1a5c2a,
            roughness: 0.9,
            metalness: 0.0
        });
        this.campusGround = new THREE.Mesh(groundGeo, groundMat);
        this.campusGround.rotation.x = -Math.PI / 2;
        this.campusGround.position.y = -0.1;
        this.campusGround.receiveShadow = true;
        this.scene.add(this.campusGround);

        // Subtle grid lines for arcade feel
        const gridHelper = new THREE.GridHelper(1200, 60, 0x1a6630, 0x1a6630);
        gridHelper.material.opacity = 0.15;
        gridHelper.material.transparent = true;
        gridHelper.position.y = 0.05;
        this.scene.add(gridHelper);

        // Walkways / paths (lighter strips)
        this._addPath(0, 0, 600, 4, 0);           // N-S main path
        this._addPath(0, 0, 400, 4, Math.PI / 2);  // E-W cross path
        this._addPath(50, 0, 300, 3, Math.PI / 4);  // Diagonal
        this._addPath(-30, 0, 250, 3, -Math.PI / 6);

        // Campus buildings (simple blocks with UNC colors)
        this._addBuilding(-60, 40, 50, 15, 30, 0x8B7355);   // South Building
        this._addBuilding(80, -20, 40, 12, 35, 0x7A6B52);    // Wilson Library
        this._addBuilding(-40, -80, 35, 10, 25, 0x6B5B47);   // Greenlaw
        this._addBuilding(100, 60, 45, 18, 30, 0x7A6B52);    // Davis Library
        this._addBuilding(-80, 100, 30, 10, 20, 0x8B7355);   // Hamilton
        this._addBuilding(40, 120, 55, 14, 40, 0x6B5B47);    // Student Union
        this._addBuilding(-100, -40, 35, 12, 28, 0x7A6B52);
        this._addBuilding(120, -80, 40, 10, 30, 0x8B7355);
        this._addBuilding(-20, 180, 30, 8, 22, 0x6B5B47);
        this._addBuilding(60, -150, 45, 16, 35, 0x7A6B52);

        // Trees scattered around campus
        for (let i = 0; i < 80; i++) {
            const x = (Math.random() - 0.5) * 800;
            const z = (Math.random() - 0.5) * 800;
            this._addTree(x, z, 3 + Math.random() * 4);
        }
    },

    _addPath(x, z, length, width, rotation) {
        const geo = new THREE.PlaneGeometry(width, length);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xc4a882,
            roughness: 0.95
        });
        const path = new THREE.Mesh(geo, mat);
        path.rotation.x = -Math.PI / 2;
        path.rotation.z = rotation;
        path.position.set(x, 0.02, z);
        this.scene.add(path);
    },

    _addBuilding(x, z, width, height, depth, color) {
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.1
        });
        const building = new THREE.Mesh(geo, mat);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);
        this.buildings.push(building);

        // Roof accent (Carolina Blue trim)
        const roofGeo = new THREE.BoxGeometry(width + 1, 0.5, depth + 1);
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0x4B9CD3, // Carolina Blue
            roughness: 0.5,
            metalness: 0.2
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(x, height, z);
        this.scene.add(roof);
    },

    _addTree(x, z, size) {
        const group = new THREE.Group();

        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(size * 0.1, size * 0.15, size * 0.6, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = size * 0.3;
        group.add(trunk);

        // Canopy (sphere)
        const canopyGeo = new THREE.SphereGeometry(size * 0.6, 8, 6);
        const shade = 0.5 + Math.random() * 0.3;
        const canopyMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(shade * 0.15, shade * 0.5 + 0.1, shade * 0.15),
            roughness: 0.9
        });
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.y = size * 0.7;
        canopy.castShadow = true;
        group.add(canopy);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.trees.push(group);
    },

    _createBall() {
        // Golf ball — bigger for arcade visibility
        const geo = new THREE.SphereGeometry(1.5, 16, 12);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.0,
            emissive: 0x333333
        });
        this.ball = new THREE.Mesh(geo, mat);
        this.ball.castShadow = true;
        this.ball.position.y = 1.5;
        this.scene.add(this.ball);

        // Ball glow ring (pulsing circle under ball)
        const glowGeo = new THREE.RingGeometry(2, 4, 24);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x44ffaa,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        this.ballGlow = new THREE.Mesh(glowGeo, glowMat);
        this.ballGlow.rotation.x = -Math.PI / 2;
        this.ballGlow.position.y = 0.1;
        this.scene.add(this.ballGlow);

        // Ball shadow
        const shadowGeo = new THREE.CircleGeometry(2, 16);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3
        });
        this.ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.ballShadow.rotation.x = -Math.PI / 2;
        this.ballShadow.position.y = 0.05;
        this.scene.add(this.ballShadow);

        // "YOU" label sprite
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext('2d');
        ctx.fillStyle = '#44ffaa';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', 64, 40);
        const labelTex = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
        this.playerLabel = new THREE.Sprite(labelMat);
        this.playerLabel.scale.set(12, 6, 1);
        this.playerLabel.position.y = 10;
        this.scene.add(this.playerLabel);
    },

    _createHole() {
        this.holeGroup = new THREE.Group();
        this.scene.add(this.holeGroup);

        // Putting green — larger for arcade style
        const greenGeo = new THREE.CylinderGeometry(12, 12, 0.3, 32);
        const greenMat = new THREE.MeshStandardMaterial({
            color: 0x2ecc40,
            roughness: 0.6
        });
        this.green = new THREE.Mesh(greenGeo, greenMat);
        this.green.position.y = 0.15;
        this.green.receiveShadow = true;
        this.holeGroup.add(this.green);

        // Hole cup
        const cupGeo = new THREE.CylinderGeometry(2, 2, 0.5, 16);
        const cupMat = new THREE.MeshStandardMaterial({ color: 0x1a0f05 });
        const cup = new THREE.Mesh(cupGeo, cupMat);
        cup.position.y = 0.3;
        this.holeGroup.add(cup);

        // Pulse ring
        const ringGeo = new THREE.RingGeometry(12, 14, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x44ff66,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        this.pulseRing = new THREE.Mesh(ringGeo, ringMat);
        this.pulseRing.rotation.x = -Math.PI / 2;
        this.pulseRing.position.y = 0.2;
        this.holeGroup.add(this.pulseRing);

        // Old Well structure
        this._createOldWell();

        // Flag pole (tall for visibility)
        const poleGeo = new THREE.CylinderGeometry(0.3, 0.3, 25, 6);
        const poleMat = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            metalness: 0.5,
            roughness: 0.3
        });
        this.flagPole = new THREE.Mesh(poleGeo, poleMat);
        this.flagPole.position.set(0, 12.5, 0);
        this.flagPole.castShadow = true;
        this.holeGroup.add(this.flagPole);

        // Flag cloth — UNC Carolina Blue
        const flagGeo = new THREE.PlaneGeometry(8, 5, 10, 1);
        const flagMat = new THREE.MeshStandardMaterial({
            color: 0x4B9CD3, // Carolina Blue!
            side: THREE.DoubleSide,
            roughness: 0.8
        });
        this.flagCloth = new THREE.Mesh(flagGeo, flagMat);
        this.flagCloth.position.set(4.5, 22, 0);
        this.holeGroup.add(this.flagCloth);

        // "THE OLD WELL" label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 512;
        labelCanvas.height = 128;
        const ctx = labelCanvas.getContext('2d');
        ctx.fillStyle = '#ffd740';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('THE OLD WELL', 256, 60);
        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#4B9CD3';
        ctx.fillText('UNC Chapel Hill', 256, 100);
        const labelTex = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
        const label = new THREE.Sprite(labelMat);
        label.scale.set(40, 10, 1);
        label.position.y = 32;
        this.holeGroup.add(label);

        this.holeGroup.visible = false;
    },

    _createOldWell() {
        // The Old Well — a miniature neoclassical rotunda
        const wellGroup = new THREE.Group();

        // Base platform (circular)
        const baseGeo = new THREE.CylinderGeometry(6, 7, 1, 16);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0xe8dcc8,
            roughness: 0.6
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.5;
        wellGroup.add(base);

        // Steps
        const stepGeo = new THREE.CylinderGeometry(7.5, 8, 0.4, 16);
        const step = new THREE.Mesh(stepGeo, baseMat.clone());
        step.position.y = 0.1;
        wellGroup.add(step);

        // Columns (8 around the perimeter)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const cx = Math.cos(angle) * 4.5;
            const cz = Math.sin(angle) * 4.5;

            const colGeo = new THREE.CylinderGeometry(0.35, 0.4, 8, 8);
            const colMat = new THREE.MeshStandardMaterial({
                color: 0xf0e6d6,
                roughness: 0.4,
                metalness: 0.1
            });
            const col = new THREE.Mesh(colGeo, colMat);
            col.position.set(cx, 5, cz);
            col.castShadow = true;
            wellGroup.add(col);

            // Column capital
            const capGeo = new THREE.BoxGeometry(1.2, 0.6, 1.2);
            const cap = new THREE.Mesh(capGeo, colMat.clone());
            cap.position.set(cx, 9.2, cz);
            wellGroup.add(cap);
        }

        // Dome roof
        const domeGeo = new THREE.SphereGeometry(5.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.5);
        const domeMat = new THREE.MeshStandardMaterial({
            color: 0xd4c4a8,
            roughness: 0.5,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 9;
        dome.castShadow = true;
        wellGroup.add(dome);

        // Center well basin
        const basinGeo = new THREE.CylinderGeometry(1.5, 1.5, 2, 12);
        const basinMat = new THREE.MeshStandardMaterial({
            color: 0xccbbaa,
            roughness: 0.5
        });
        const basin = new THREE.Mesh(basinGeo, basinMat);
        basin.position.y = 2;
        wellGroup.add(basin);

        // Water surface in basin
        const waterGeo = new THREE.CircleGeometry(1.4, 12);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x4488cc,
            roughness: 0.1,
            metalness: 0.6,
            transparent: true,
            opacity: 0.8
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 2.8;
        wellGroup.add(water);

        wellGroup.position.y = 0.3;
        this.oldWellGroup = wellGroup;
        this.holeGroup.add(wellGroup);
    },

    _createAimLine() {
        const lineGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(60 * 3);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x44ffaa,
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });
        this.aimLine = new THREE.Line(lineGeo, lineMat);
        this.aimLine.visible = false;
        this.scene.add(this.aimLine);

        // Landing marker — bigger for arcade
        const markerGeo = new THREE.RingGeometry(2, 3.5, 16);
        const markerMat = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        this.landingMarker = new THREE.Mesh(markerGeo, markerMat);
        this.landingMarker.rotation.x = -Math.PI / 2;
        this.landingMarker.visible = false;
        this.scene.add(this.landingMarker);
    },

    _createCourseLine() {
        // Dashed line from ball to hole
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(200 * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.LineDashedMaterial({
            color: 0xffd740,
            transparent: true,
            opacity: 0.4,
            dashSize: 5,
            gapSize: 5
        });
        this.courseLine = new THREE.Line(geo, mat);
        this.courseLine.visible = false;
        this.scene.add(this.courseLine);
    },

    // --- Update methods (all guard on this.ready) ---

    updateBall(x, y, z) {
        if (!this.ready || !this.ball) return;
        this.ball.position.set(x, y + 1.5, z);
        if (this.ballGlow) this.ballGlow.position.set(x, 0.1, z);
        if (this.ballShadow) this.ballShadow.position.set(x, 0.05, z);
        if (this.playerLabel) this.playerLabel.position.set(x, y + 10, z);

        // Scale shadow based on height
        if (this.ballShadow) {
            const shadowScale = Math.max(0.5, 1 - y / 50);
            this.ballShadow.scale.set(shadowScale, shadowScale, 1);
            this.ballShadow.material.opacity = 0.3 * shadowScale;
        }

        // Trail
        if (BallPhysics.state === 'flight' || BallPhysics.state === 'rolling') {
            const trailDot = new THREE.Mesh(
                new THREE.SphereGeometry(0.8, 4, 4),
                new THREE.MeshBasicMaterial({
                    color: 0x44ffaa,
                    transparent: true,
                    opacity: 0.6
                })
            );
            trailDot.position.set(x, y + 1, z);
            this.scene.add(trailDot);
            this.ballTrail.push({ mesh: trailDot, age: 0 });
        }

        // Fade trail
        for (let i = this.ballTrail.length - 1; i >= 0; i--) {
            this.ballTrail[i].age += 0.016;
            this.ballTrail[i].mesh.material.opacity = Math.max(0, 0.6 - this.ballTrail[i].age * 0.8);
            if (this.ballTrail[i].age > 0.75) {
                this.scene.remove(this.ballTrail[i].mesh);
                this.ballTrail[i].mesh.geometry.dispose();
                this.ballTrail[i].mesh.material.dispose();
                this.ballTrail.splice(i, 1);
            }
        }
    },

    setHolePosition(x, z) {
        if (!this.ready || !this.holeGroup) return;
        this.holeGroup.position.set(x, 0, z);
        this.holeGroup.visible = true;

        // Add fairway strip from origin to hole
        this._updateFairway(x, z);
    },

    _updateFairway(hx, hz) {
        // Remove old fairway
        if (this.fairway) {
            this.scene.remove(this.fairway);
            this.fairway.geometry.dispose();
            this.fairway.material.dispose();
        }

        const bx = BallPhysics.position.x;
        const bz = BallPhysics.position.z;
        const dist = Math.sqrt((hx - bx) ** 2 + (hz - bz) ** 2);
        const angle = Math.atan2(hx - bx, hz - bz);

        const fwGeo = new THREE.PlaneGeometry(18, dist + 30);
        const fwMat = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.8,
            transparent: true,
            opacity: 0.6
        });
        this.fairway = new THREE.Mesh(fwGeo, fwMat);
        this.fairway.rotation.x = -Math.PI / 2;
        this.fairway.rotation.z = -angle;
        this.fairway.position.set(
            (bx + hx) / 2,
            0.01,
            (bz + hz) / 2
        );
        this.scene.add(this.fairway);
    },

    updateCourseLine(ballPos, holePos) {
        if (!this.ready || !this.courseLine) return;
        const positions = this.courseLine.geometry.attributes.position;
        const segments = 100;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            positions.setXYZ(i,
                ballPos.x + (holePos.x - ballPos.x) * t,
                0.5,
                ballPos.z + (holePos.z - ballPos.z) * t
            );
        }
        positions.needsUpdate = true;
        this.courseLine.geometry.setDrawRange(0, segments + 1);
        this.courseLine.computeLineDistances();
        this.courseLine.visible = true;
    },

    updateFlag(time) {
        if (!this.ready || !this.flagCloth) return;
        const geo = this.flagCloth.geometry;
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const wave = Math.sin(time * 4 + x * 3) * 0.3 * Math.abs(x);
            pos.setZ(i, wave);
        }
        pos.needsUpdate = true;
    },

    updatePulse(time, distanceFromBall) {
        if (!this.ready || !this.pulseRing) return;
        const proximity = Math.max(0, 1 - distanceFromBall / 50);
        const speed = 2 + proximity * 4;
        const amount = 0.1 + proximity * 0.2;
        const scale = 1 + Math.sin(time * speed) * amount;
        this.pulseRing.scale.set(scale, scale, 1);
        this.pulseRing.material.opacity = 0.3 + proximity * 0.4;

        // Ball glow pulse
        if (this.ballGlow) {
            const gs = 1 + Math.sin(time * 3) * 0.15;
            this.ballGlow.scale.set(gs, gs, 1);
            this.ballGlow.material.opacity = 0.3 + Math.sin(time * 2) * 0.15;
        }
    },

    showAimLine(ballPos, dirX, dirZ, power) {
        if (!this.ready || !this.aimLine || !this.landingMarker) return;
        if (power < 0.05) {
            this.aimLine.visible = false;
            this.landingMarker.visible = false;
            return;
        }

        this.aimLine.visible = true;

        const angle = 15 + power * 30;
        const rad = angle * Math.PI / 180;
        const actualPower = 2 + power * 23;

        const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
        const nx = dirX / len;
        const nz = dirZ / len;

        let vx = nx * Math.cos(rad) * actualPower;
        let vy = Math.sin(rad) * actualPower;
        let vz = nz * Math.cos(rad) * actualPower;

        let px = ballPos.x, py = ballPos.y, pz = ballPos.z;
        const positions = this.aimLine.geometry.attributes.position;
        const dt = 0.15;
        let landX = px, landZ = pz;
        let count = 0;

        for (let i = 0; i < 20; i++) {
            positions.setXYZ(i, px, py + 1.5, pz);
            count++;

            vy += -9.81 * dt;
            px += vx * dt;
            py += vy * dt;
            pz += vz * dt;

            if (py <= ballPos.y && i > 0) {
                landX = px;
                landZ = pz;
                for (let j = i + 1; j < 20; j++) {
                    positions.setXYZ(j, landX, ballPos.y + 0.5, landZ);
                    count++;
                }
                break;
            }
            landX = px;
            landZ = pz;
        }

        positions.needsUpdate = true;
        this.aimLine.geometry.setDrawRange(0, count || 20);

        this.landingMarker.visible = true;
        this.landingMarker.position.set(landX, 0.3, landZ);
    },

    hideAim() {
        if (this.aimLine) this.aimLine.visible = false;
        if (this.landingMarker) this.landingMarker.visible = false;
    },

    // Intro camera animation: sweeps from player to hole
    startIntroAnimation(ballPos, holePos) {
        if (!this.ready || !this.camera) { this.introAnimating = false; return; }
        this.introAnimating = true;
        this.introPhase = 0;
        this.introTimer = 0;
        this.introBallPos = { ...ballPos };
        this.introHolePos = { ...holePos };

        const dist = Math.sqrt(
            (holePos.x - ballPos.x) ** 2 + (holePos.z - ballPos.z) ** 2
        );
        this.introHeight = Math.max(80, dist * 0.7);
        this.camera.position.set(ballPos.x, 40, ballPos.z + 30);
        this.camera.lookAt(ballPos.x, 0, ballPos.z);
    },

    updateIntroAnimation(dt) {
        if (!this.ready || !this.introAnimating || !this.camera) return true;

        this.introTimer += dt;
        const bp = this.introBallPos;
        const hp = this.introHolePos;
        const midX = (bp.x + hp.x) / 2;
        const midZ = (bp.z + hp.z) / 2;
        const dist = Math.sqrt((hp.x - bp.x) ** 2 + (hp.z - bp.z) ** 2);

        // Phase 0: Zoom out from player (0-1.5s)
        if (this.introTimer < 1.5) {
            const t = this.introTimer / 1.5;
            const ease = t * t * (3 - 2 * t); // smoothstep
            this.camera.position.lerp(
                new THREE.Vector3(midX, this.introHeight * 0.5, midZ + this.introHeight * 0.4), 0.04
            );
            this.camera.lookAt(
                bp.x + (midX - bp.x) * ease,
                0,
                bp.z + (midZ - bp.z) * ease
            );
        }
        // Phase 1: Pan to show whole course (1.5-3.5s)
        else if (this.introTimer < 3.5) {
            const t = (this.introTimer - 1.5) / 2;
            const ease = t * t * (3 - 2 * t);
            this.camera.position.lerp(
                new THREE.Vector3(
                    midX + dist * 0.15,
                    this.introHeight,
                    midZ + dist * 0.35
                ), 0.04
            );
            this.camera.lookAt(
                midX + (hp.x - midX) * ease * 0.5,
                0,
                midZ + (hp.z - midZ) * ease * 0.5
            );
        }
        // Phase 2: Settle into play position (3.5-4.5s)
        else {
            const t = Math.min(1, (this.introTimer - 3.5) / 1.0);
            if (t >= 1) {
                this.introAnimating = false;
                return true; // done
            }
        }

        return false;
    },

    updateCamera(ballPos, holePos, state) {
        if (!this.ready || !this.camera || this.introAnimating) return;

        const midX = (ballPos.x + holePos.x) * 0.5;
        const midZ = (ballPos.z + holePos.z) * 0.5;
        const dist = Math.sqrt(
            (holePos.x - ballPos.x) ** 2 + (holePos.z - ballPos.z) ** 2
        );

        if (state === 'flight' || state === 'rolling') {
            // Follow ball, slightly zoomed in
            const height = Math.max(40, dist * 0.4);
            const target = new THREE.Vector3(
                ballPos.x,
                height,
                ballPos.z + height * 0.5
            );
            this.camera.position.lerp(target, 0.04);
            this.camera.lookAt(ballPos.x, 0, ballPos.z);
        } else {
            // Overview: see both ball and hole
            const height = Math.max(60, dist * 0.6);
            const target = new THREE.Vector3(
                midX + dist * 0.05,
                height,
                midZ + height * 0.4
            );
            this.camera.position.lerp(target, 0.03);
            this.camera.lookAt(midX, 0, midZ);
        }
    },

    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },

    _onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
};
