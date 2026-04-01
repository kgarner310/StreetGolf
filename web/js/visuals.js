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
            // Light sky-blue background so scene is clearly visible
            this.scene.background = new THREE.Color(0x87CEEB);

            // Camera
            this.camera = new THREE.PerspectiveCamera(
                50, window.innerWidth / window.innerHeight, 0.1, 8000
            );
            this.camera.position.set(0, 600, 300);
            this.camera.lookAt(0, 0, 0);

            // Renderer — try without antialias first on mobile
            try {
                this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            } catch (e) {
                this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
            }
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setClearColor(0x87CEEB, 1);

            // Bright lighting so everything is clearly visible
            this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
            const sun = new THREE.DirectionalLight(0xffffff, 1.2);
            sun.position.set(200, 400, 100);
            this.scene.add(sun);
            const fill = new THREE.DirectionalLight(0x88bbff, 0.4);
            fill.position.set(-100, 200, -50);
            this.scene.add(fill);

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
        // Main grass ground — large area covering 600yd holes
        const groundGeo = new THREE.PlaneGeometry(3000, 3000, 20, 20);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x4CAF50,
            roughness: 0.9,
            metalness: 0.0
        });
        this.campusGround = new THREE.Mesh(groundGeo, groundMat);
        this.campusGround.rotation.x = -Math.PI / 2;
        this.campusGround.position.y = -0.1;
        this.campusGround.receiveShadow = true;
        this.scene.add(this.campusGround);

        // Subtle grid lines for arcade feel
        const gridHelper = new THREE.GridHelper(3000, 60, 0x388E3C, 0x388E3C);
        gridHelper.material.opacity = 0.3;
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
            color: 0xD2B48C,
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
        // Golf ball — large, bright white, visible from any zoom
        const geo = new THREE.SphereGeometry(3, 16, 12);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.0,
            emissive: 0x666666
        });
        this.ball = new THREE.Mesh(geo, mat);
        this.ball.position.y = 3;
        this.scene.add(this.ball);

        // Bright glow ring under ball
        const glowGeo = new THREE.RingGeometry(4, 8, 24);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x44ffaa,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        this.ballGlow = new THREE.Mesh(glowGeo, glowMat);
        this.ballGlow.rotation.x = -Math.PI / 2;
        this.ballGlow.position.y = 0.2;
        this.scene.add(this.ballGlow);

        // Ground shadow
        const shadowGeo = new THREE.CircleGeometry(4, 16);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000, transparent: true, opacity: 0.4
        });
        this.ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.ballShadow.rotation.x = -Math.PI / 2;
        this.ballShadow.position.y = 0.05;
        this.scene.add(this.ballShadow);
    },

    _createHole() {
        this.holeGroup = new THREE.Group();
        this.scene.add(this.holeGroup);

        // Putting green — larger for arcade style
        const greenGeo = new THREE.CylinderGeometry(12, 12, 0.3, 32);
        const greenMat = new THREE.MeshStandardMaterial({
            color: 0x81C784,
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

        // Dynamic hole label (updated per hole)
        this.holeLabelCanvas = document.createElement('canvas');
        this.holeLabelCanvas.width = 512;
        this.holeLabelCanvas.height = 96;
        const labelTex = new THREE.CanvasTexture(this.holeLabelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
        this.holeLabelSprite = new THREE.Sprite(labelMat);
        this.holeLabelSprite.scale.set(50, 10, 1);
        this.holeLabelSprite.position.y = 32;
        this.holeGroup.add(this.holeLabelSprite);

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

        // Ball position — scale up height for visibility
        const visualY = y * 1.5 + 3;
        this.ball.position.set(x, visualY, z);

        // Ball gets bigger and glows during flight
        if (BallPhysics.state === 'flight') {
            const heightScale = 1 + y * 0.02;
            this.ball.scale.set(heightScale, heightScale, heightScale);
            this.ball.material.emissive.setHex(0xaaaa44);
        } else {
            this.ball.scale.set(1, 1, 1);
            this.ball.material.emissive.setHex(0x666666);
        }

        // Ground glow follows ball on ground
        if (this.ballGlow) {
            this.ballGlow.position.set(x, 0.2, z);
            // Glow brighter during flight
            this.ballGlow.material.opacity = BallPhysics.state === 'flight' ? 0.8 : 0.5;
        }

        // Shadow stays on ground, shrinks with height
        if (this.ballShadow) {
            this.ballShadow.position.set(x, 0.05, z);
            const shadowScale = Math.max(0.3, 1 - y / 100);
            this.ballShadow.scale.set(shadowScale, shadowScale, 1);
            this.ballShadow.material.opacity = 0.4 * shadowScale;
        }

        // Trail — bigger, brighter during flight
        if (BallPhysics.state === 'flight' || BallPhysics.state === 'rolling') {
            this._trailCounter = (this._trailCounter || 0) + 1;
            // Drop trail every other frame to avoid too many objects
            if (this._trailCounter % 2 === 0) {
                const trailSize = BallPhysics.state === 'flight' ? 2.0 : 1.0;
                const trailColor = BallPhysics.state === 'flight' ? 0xffff44 : 0x44ffaa;
                const trailDot = new THREE.Mesh(
                    new THREE.SphereGeometry(trailSize, 4, 4),
                    new THREE.MeshBasicMaterial({
                        color: trailColor,
                        transparent: true,
                        opacity: 0.8
                    })
                );
                trailDot.position.set(x, visualY * 0.7, z);
                this.scene.add(trailDot);
                this.ballTrail.push({ mesh: trailDot, age: 0 });
            }
        }

        // Fade and cleanup trail
        for (let i = this.ballTrail.length - 1; i >= 0; i--) {
            this.ballTrail[i].age += 0.016;
            this.ballTrail[i].mesh.material.opacity = Math.max(0, 0.8 - this.ballTrail[i].age);
            if (this.ballTrail[i].age > 0.8) {
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

        this._updateFairway(x, z);
    },

    setHoleLabel(name) {
        if (!this.holeLabelCanvas || !this.holeLabelSprite) return;
        const ctx = this.holeLabelCanvas.getContext('2d');
        ctx.clearRect(0, 0, 512, 96);
        ctx.fillStyle = '#ffd740';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name || '', 256, 55);
        this.holeLabelSprite.material.map.needsUpdate = true;
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
            color: 0x66BB6A,
            roughness: 0.8
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

    showAimLine(ballPos, dirX, dirZ, swipePower, club) {
        if (!this.ready || !this.aimLine || !this.landingMarker) return;
        if (swipePower < 0.05 || !club) {
            this.aimLine.visible = false;
            this.landingMarker.visible = false;
            return;
        }

        this.aimLine.visible = true;

        const actualPower = club.speed * (0.3 + swipePower * 0.7);
        const rad = club.angle * Math.PI / 180;

        const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
        const nx = dirX / len;
        const nz = dirZ / len;

        let vx = nx * Math.cos(rad) * actualPower;
        let vy = Math.sin(rad) * actualPower;
        let vz = nz * Math.cos(rad) * actualPower;

        let px = ballPos.x, py = ballPos.y, pz = ballPos.z;
        const positions = this.aimLine.geometry.attributes.position;
        const dt = 0.12;
        let landX = px, landZ = pz;
        let count = 0;

        for (let i = 0; i < 20; i++) {
            positions.setXYZ(i, px, (py * 1.5) + 3, pz);
            count++;

            vy += -32.2 * dt;
            px += vx * dt;
            py += vy * dt;
            pz += vz * dt;

            if (py <= ballPos.y && i > 0) {
                landX = px;
                landZ = pz;
                for (let j = i + 1; j < 20; j++) {
                    positions.setXYZ(j, landX, 1, landZ);
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

    // Intro camera animation: sweeps from ball up to show both ball and hole
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

        // Calculate the height needed to frame both points
        const fovRad = this.camera.fov * Math.PI / 180;
        const aspect = this.camera.aspect;
        const halfExtent = (dist / 2) * 1.4;
        const hForV = halfExtent / Math.tan(fovRad / 2);
        const hForH = halfExtent / (Math.tan(fovRad / 2) * aspect);
        this.introHeight = Math.max(100, Math.max(hForV, hForH));

        // Start close to the ball
        this.camera.position.set(ballPos.x, 60, ballPos.z + 40);
        this.camera.lookAt(ballPos.x, 0, ballPos.z);
    },

    updateIntroAnimation(dt) {
        if (!this.ready || !this.introAnimating || !this.camera) return true;

        this.introTimer += dt;
        const bp = this.introBallPos;
        const hp = this.introHolePos;
        const midX = (bp.x + hp.x) / 2;
        const midZ = (bp.z + hp.z) / 2;

        // Phase 0: Zoom out from player to show ball (0-1s)
        if (this.introTimer < 1.0) {
            const t = this.introTimer / 1.0;
            const ease = t * t * (3 - 2 * t);
            this.camera.position.lerp(
                new THREE.Vector3(bp.x, this.introHeight * 0.4, bp.z + this.introHeight * 0.2), 0.06
            );
            this.camera.lookAt(
                bp.x + (midX - bp.x) * ease * 0.3,
                0,
                bp.z + (midZ - bp.z) * ease * 0.3
            );
        }
        // Phase 1: Pan up to show entire course — ball AND hole (1-3s)
        else if (this.introTimer < 3.0) {
            const t = (this.introTimer - 1.0) / 2.0;
            const ease = t * t * (3 - 2 * t);
            const targetPos = new THREE.Vector3(
                midX,
                this.introHeight,
                midZ + this.introHeight * 0.15
            );
            this.camera.position.lerp(targetPos, 0.05);
            this.camera.lookAt(
                bp.x + (midX - bp.x) * ease,
                0,
                bp.z + (midZ - bp.z) * ease
            );
        }
        // Phase 2: Settle into final play position (3-3.8s)
        else {
            const t = Math.min(1, (this.introTimer - 3.0) / 0.8);
            const targetPos = new THREE.Vector3(
                midX,
                this.introHeight,
                midZ + this.introHeight * 0.15
            );
            this.camera.position.lerp(targetPos, 0.08);
            this.camera.lookAt(midX, 0, midZ);
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

        // Apply zoom factor (pinch-to-zoom)
        const zoom = this.zoomLevel || 1.0;

        if (state === 'flight' || state === 'rolling') {
            // Follow ball but keep enough height to see the hole too
            const flightMidX = (ballPos.x + holePos.x) * 0.5;
            const flightMidZ = (ballPos.z + holePos.z) * 0.5;
            const height = Math.max(80, dist * 0.8) * zoom;
            const target = new THREE.Vector3(
                flightMidX,
                height,
                flightMidZ + height * 0.25
            );
            this.camera.position.lerp(target, 0.05);
            this.camera.lookAt(flightMidX, 0, flightMidZ);
        } else {
            // Aiming / overview: frame BOTH ball and hole
            const fovRad = this.camera.fov * Math.PI / 180;
            const aspect = this.camera.aspect;

            const padding = 1.4;
            const halfExtent = (dist / 2) * padding;

            const heightForVert = halfExtent / Math.tan(fovRad / 2);
            const heightForHoriz = halfExtent / (Math.tan(fovRad / 2) * aspect);

            const height = Math.max(100, Math.max(heightForVert, heightForHoriz)) * zoom;

            const target = new THREE.Vector3(
                midX,
                height,
                midZ + height * 0.15
            );
            this.camera.position.lerp(target, 0.04);
            this.camera.lookAt(midX, 0, midZ);
        }
    },

    // Draw the OSRM driving route as the fairway on the 3D scene
    // routePoints is an array of {x, z} in game-world yards
    drawRouteFairway(routePoints) {
        if (!this.ready || !routePoints || routePoints.length < 2) return;

        // Remove old route fairway
        this._clearRouteFairway();

        this.routeFairwayGroup = new THREE.Group();

        // Road surface — thick line segments as quads
        const roadWidth = 22;
        for (let i = 0; i < routePoints.length - 1; i++) {
            const p0 = routePoints[i];
            const p1 = routePoints[i + 1];
            const dx = p1.x - p0.x;
            const dz = p1.z - p0.z;
            const segLen = Math.sqrt(dx * dx + dz * dz);
            if (segLen < 0.5) continue;

            const angle = Math.atan2(dx, dz);

            const segGeo = new THREE.PlaneGeometry(roadWidth, segLen);
            const segMat = new THREE.MeshStandardMaterial({
                color: 0x555555,
                roughness: 0.9
            });
            const seg = new THREE.Mesh(segGeo, segMat);
            seg.rotation.x = -Math.PI / 2;
            seg.rotation.z = -angle;
            seg.position.set(
                (p0.x + p1.x) / 2,
                0.03,
                (p0.z + p1.z) / 2
            );
            this.routeFairwayGroup.add(seg);

            // Road edge lines (yellow dashes)
            if (i % 3 === 0) {
                const perpX = -Math.cos(angle);
                const perpZ = Math.sin(angle);
                for (const side of [-1, 1]) {
                    const edgeGeo = new THREE.PlaneGeometry(1.5, Math.min(segLen, 8));
                    const edgeMat = new THREE.MeshBasicMaterial({
                        color: 0xffdd00
                    });
                    const edge = new THREE.Mesh(edgeGeo, edgeMat);
                    edge.rotation.x = -Math.PI / 2;
                    edge.rotation.z = -angle;
                    edge.position.set(
                        (p0.x + p1.x) / 2 + perpX * (roadWidth / 2) * side,
                        0.04,
                        (p0.z + p1.z) / 2 + perpZ * (roadWidth / 2) * side
                    );
                    this.routeFairwayGroup.add(edge);
                }
            }

            // Center dashes (white)
            if (i % 4 === 0) {
                const centerGeo = new THREE.PlaneGeometry(1, Math.min(segLen, 6));
                const centerMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff
                });
                const center = new THREE.Mesh(centerGeo, centerMat);
                center.rotation.x = -Math.PI / 2;
                center.rotation.z = -angle;
                center.position.set(
                    (p0.x + p1.x) / 2,
                    0.05,
                    (p0.z + p1.z) / 2
                );
                this.routeFairwayGroup.add(center);
            }
        }

        this.scene.add(this.routeFairwayGroup);
    },

    // Fallback: straight fairway strip when route fetch fails
    drawStraightFairway(x1, z1, x2, z2) {
        if (!this.ready) return;
        this._clearRouteFairway();
        // _updateFairway already handles the straight strip
    },

    _clearRouteFairway() {
        if (this.routeFairwayGroup) {
            this.routeFairwayGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.scene.remove(this.routeFairwayGroup);
            this.routeFairwayGroup = null;
        }
    },

    // Pinch-to-zoom: temporarily scale camera height
    zoomLevel: 1.0,
    zoomTarget: 1.0,
    MIN_ZOOM: 0.3,
    MAX_ZOOM: 2.5,

    setZoom(level) {
        this.zoomTarget = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, level));
    },

    render() {
        if (this.renderer && this.scene && this.camera) {
            // Smooth zoom interpolation
            this.zoomLevel += (this.zoomTarget - this.zoomLevel) * 0.1;
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
