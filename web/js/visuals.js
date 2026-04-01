// StreetGolf 3D Visuals — Mobile-first with Canvas 2D fallback
// If WebGL fails, draws the course in 2D on the canvas

const Visuals = {
    scene: null,
    camera: null,
    renderer: null,
    ball: null,
    ballGlow: null,
    ballTrail: [],
    holeGroup: null,
    green: null,
    flagPole: null,
    flagCloth: null,
    pulseRing: null,
    aimLine: null,
    landingMarker: null,
    courseLine: null,
    fairway: null,
    routeFairwayGroup: null,

    introAnimating: false,
    introTimer: 0,
    introHeight: 300,
    intraBallPos: null,
    introHolePos: null,

    zoomLevel: 1.0,
    zoomTarget: 1.0,
    MIN_ZOOM: 0.3,
    MAX_ZOOM: 2.5,

    ready: false,
    use2D: false,
    canvas2d: null,
    ctx2d: null,
    initErrors: [],
    holeLabelCanvas: null,
    holeLabelSprite: null,

    // 2D state
    _2d: {
        ballX: 0, ballZ: 0, ballY: 0,
        holeX: 0, holeZ: 0,
        routePoints: null,
        holeVisible: false,
        aimDirX: 0, aimDirZ: 0, aimPower: 0,
        landX: 0, landZ: 0,
        holeName: ''
    },

    init() {
        const dbg = document.getElementById('debug');
        const canvas = document.getElementById('game-canvas');
        if (!canvas) { this.initErrors.push('no canvas'); return; }

        // Try WebGL
        if (typeof THREE !== 'undefined') {
            try {
                // Test context first
                const testCtx = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (!testCtx) {
                    this.initErrors.push('no-webgl-ctx');
                    throw new Error('No WebGL context');
                }
                this.initErrors.push('ctx:ok');

                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x87CEEB);

                this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 8000);
                this.camera.position.set(0, 300, 200);
                this.camera.lookAt(0, 0, 0);

                this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(1);
                this.initErrors.push('renderer:ok');

                this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));

                // Ground
                const ground = new THREE.Mesh(
                    new THREE.PlaneGeometry(3000, 3000),
                    new THREE.MeshBasicMaterial({ color: 0x4CAF50 })
                );
                ground.rotation.x = -Math.PI / 2;
                ground.position.y = -0.1;
                this.scene.add(ground);

                this._createBall();
                this._createHole();
                this._createAimLine();
                this._createCourseLine();

                // Test render
                this.renderer.render(this.scene, this.camera);
                this.initErrors.push('render:ok');

                window.addEventListener('resize', () => this._onResize());
                this.ready = true;
                this.use2D = false;
                this.initErrors.push('3D-READY');
                if (dbg) dbg.textContent = this.initErrors.join(' | ');
                return;
            } catch (e) {
                this.initErrors.push('3D-fail:' + e.message);
            }
        } else {
            this.initErrors.push('THREE-not-loaded');
        }

        // FALLBACK: Canvas 2D rendering
        this.initErrors.push('using-2D');
        this._init2DFallback(canvas);
        if (dbg) dbg.textContent = this.initErrors.join(' | ');
    },

    _init2DFallback(canvas) {
        // Remove webgl context if any by replacing canvas
        const parent = canvas.parentNode;
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'game-canvas';
        newCanvas.style.cssText = canvas.style.cssText;
        // Copy class list
        newCanvas.className = canvas.className;
        parent.replaceChild(newCanvas, canvas);

        this.canvas2d = newCanvas;
        this.canvas2d.width = window.innerWidth;
        this.canvas2d.height = window.innerHeight;
        this.ctx2d = this.canvas2d.getContext('2d');

        // Need to re-init controls on the new canvas
        if (typeof Controls !== 'undefined') {
            Controls.init();
        }

        this.use2D = true;
        this.ready = true;
        this.camera = { position: { x: 0, y: 300, z: 200 }, fov: 50, aspect: window.innerWidth / window.innerHeight };

        window.addEventListener('resize', () => {
            if (this.canvas2d) {
                this.canvas2d.width = window.innerWidth;
                this.canvas2d.height = window.innerHeight;
            }
        });

        this.initErrors.push('2D-READY');
    },

    // ---- 2D rendering ----
    _render2D() {
        const ctx = this.ctx2d;
        if (!ctx) return;
        const W = this.canvas2d.width;
        const H = this.canvas2d.height;

        // Clear with sky blue
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, W, H);

        const d = this._2d;
        const hx = d.holeX, hz = d.holeZ;
        const bx = d.ballX, bz = d.ballZ;

        // Camera: top-down view centered between ball and hole
        const zoom = this.zoomLevel || 1.0;
        const midX = (bx + hx) / 2;
        const midZ = (bz + hz) / 2;
        const dist = Math.sqrt((hx - bx) ** 2 + (hz - bz) ** 2) || 100;
        const viewSize = Math.max(dist * 1.5, 200) * zoom;

        // World-to-screen transform
        const scale = Math.min(W, H) / viewSize;
        const toScreenX = (wx) => W / 2 + (wx - midX) * scale;
        const toScreenZ = (wz) => H / 2 + (wz - midZ) * scale;

        // Draw grass background
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, W, H);

        // Draw route fairway
        if (d.routePoints && d.routePoints.length >= 2) {
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 22 * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(toScreenX(d.routePoints[0].x), toScreenZ(d.routePoints[0].z));
            for (let i = 1; i < d.routePoints.length; i++) {
                ctx.lineTo(toScreenX(d.routePoints[i].x), toScreenZ(d.routePoints[i].z));
            }
            ctx.stroke();

            // Yellow edge lines
            ctx.strokeStyle = '#FFDD00';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();

            // White center dashes
            ctx.setLineDash([6 * scale, 6 * scale]);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath();
            ctx.moveTo(toScreenX(d.routePoints[0].x), toScreenZ(d.routePoints[0].z));
            for (let i = 1; i < d.routePoints.length; i++) {
                ctx.lineTo(toScreenX(d.routePoints[i].x), toScreenZ(d.routePoints[i].z));
            }
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // Straight fairway strip
            ctx.strokeStyle = '#66BB6A';
            ctx.lineWidth = 20 * scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(toScreenX(bx), toScreenZ(bz));
            ctx.lineTo(toScreenX(hx), toScreenZ(hz));
            ctx.stroke();
        }

        // Dashed course line (ball to hole)
        ctx.setLineDash([5 * scale, 5 * scale]);
        ctx.strokeStyle = 'rgba(255, 215, 64, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(toScreenX(bx), toScreenZ(bz));
        ctx.lineTo(toScreenX(hx), toScreenZ(hz));
        ctx.stroke();
        ctx.setLineDash([]);

        // Hole (putting green + flag)
        if (d.holeVisible) {
            // Green circle
            ctx.fillStyle = '#81C784';
            ctx.beginPath();
            ctx.arc(toScreenX(hx), toScreenZ(hz), 12 * scale, 0, Math.PI * 2);
            ctx.fill();

            // Hole cup
            ctx.fillStyle = '#1a0f05';
            ctx.beginPath();
            ctx.arc(toScreenX(hx), toScreenZ(hz), 3 * scale, 0, Math.PI * 2);
            ctx.fill();

            // Pulse ring
            const pulseScale = 1 + Math.sin(performance.now() / 300) * 0.15;
            ctx.strokeStyle = '#44ff66';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(toScreenX(hx), toScreenZ(hz), 14 * scale * pulseScale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Flag
            const flagX = toScreenX(hx);
            const flagZ = toScreenZ(hz);
            ctx.strokeStyle = '#dddddd';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(flagX, flagZ);
            ctx.lineTo(flagX, flagZ - 30);
            ctx.stroke();

            // Flag cloth (Carolina Blue)
            ctx.fillStyle = '#4B9CD3';
            ctx.beginPath();
            ctx.moveTo(flagX, flagZ - 30);
            ctx.lineTo(flagX + 15, flagZ - 25);
            ctx.lineTo(flagX, flagZ - 20);
            ctx.fill();

            // Hole name label
            if (d.holeName) {
                ctx.fillStyle = '#ffd740';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(d.holeName, flagX, flagZ - 35);
            }
        }

        // Aim line
        if (d.aimPower > 0.05) {
            ctx.strokeStyle = '#44ffaa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(toScreenX(bx), toScreenZ(bz));
            ctx.lineTo(toScreenX(d.landX), toScreenZ(d.landZ));
            ctx.stroke();

            // Landing marker
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(toScreenX(d.landX), toScreenZ(d.landZ), 4 * scale, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Ball
        const ballScreenX = toScreenX(bx);
        const ballScreenZ = toScreenZ(bz);

        // Ball glow
        ctx.fillStyle = 'rgba(68, 255, 170, 0.4)';
        ctx.beginPath();
        ctx.arc(ballScreenX, ballScreenZ, 8 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Ball (grows during flight)
        const ballSize = d.ballY > 1 ? 5 + d.ballY * 0.3 : 4;
        ctx.fillStyle = d.ballY > 1 ? '#ffffaa' : '#ffffff';
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ballScreenX, ballScreenZ, ballSize * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ball shadow text showing height during flight
        if (d.ballY > 2) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(ballScreenX, ballScreenZ + 10 * scale, 4 * scale, 2 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // ---- 3D helpers (same as before) ----
    _createBall() {
        const geo = new THREE.SphereGeometry(3, 12, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.ball = new THREE.Mesh(geo, mat);
        this.ball.position.y = 3;
        this.scene.add(this.ball);

        const glowGeo = new THREE.RingGeometry(4, 8, 16);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        this.ballGlow = new THREE.Mesh(glowGeo, glowMat);
        this.ballGlow.rotation.x = -Math.PI / 2;
        this.ballGlow.position.y = 0.2;
        this.scene.add(this.ballGlow);
    },

    _createHole() {
        this.holeGroup = new THREE.Group();
        this.scene.add(this.holeGroup);

        const greenMat = new THREE.MeshBasicMaterial({ color: 0x81C784 });
        this.green = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 0.3, 16), greenMat);
        this.green.position.y = 0.15;
        this.holeGroup.add(this.green);

        const cup = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0x1a0f05 }));
        cup.position.y = 0.3;
        this.holeGroup.add(cup);

        const ringMat = new THREE.MeshBasicMaterial({ color: 0x44ff66, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        this.pulseRing = new THREE.Mesh(new THREE.RingGeometry(12, 14, 16), ringMat);
        this.pulseRing.rotation.x = -Math.PI / 2;
        this.pulseRing.position.y = 0.2;
        this.holeGroup.add(this.pulseRing);

        this.flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 25, 4), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
        this.flagPole.position.set(0, 12.5, 0);
        this.holeGroup.add(this.flagPole);

        this.flagCloth = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshBasicMaterial({ color: 0x4B9CD3, side: THREE.DoubleSide }));
        this.flagCloth.position.set(4.5, 22, 0);
        this.holeGroup.add(this.flagCloth);

        this.holeLabelCanvas = document.createElement('canvas');
        this.holeLabelCanvas.width = 512;
        this.holeLabelCanvas.height = 96;
        const labelTex = new THREE.CanvasTexture(this.holeLabelCanvas);
        this.holeLabelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
        this.holeLabelSprite.scale.set(50, 10, 1);
        this.holeLabelSprite.position.y = 32;
        this.holeGroup.add(this.holeLabelSprite);

        this.holeGroup.visible = false;
    },

    _createAimLine() {
        const positions = new Float32Array(60 * 3);
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.aimLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x44ffaa }));
        this.aimLine.visible = false;
        this.scene.add(this.aimLine);

        this.landingMarker = new THREE.Mesh(
            new THREE.RingGeometry(2, 3.5, 12),
            new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
        );
        this.landingMarker.rotation.x = -Math.PI / 2;
        this.landingMarker.visible = false;
        this.scene.add(this.landingMarker);
    },

    _createCourseLine() {
        const positions = new Float32Array(200 * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.courseLine = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xffd740, dashSize: 5, gapSize: 5 }));
        this.courseLine.visible = false;
        this.scene.add(this.courseLine);
    },

    // ---- Public API (works for both 2D and 3D) ----

    updateBall(x, y, z) {
        this._2d.ballX = x;
        this._2d.ballZ = z;
        this._2d.ballY = y;

        if (this.use2D || !this.ready) return;
        if (!this.ball) return;

        const visualY = y * 1.5 + 3;
        this.ball.position.set(x, visualY, z);
        if (BallPhysics.state === 'flight') {
            const s = 1 + y * 0.02;
            this.ball.scale.set(s, s, s);
            this.ball.material.color.setHex(0xffffaa);
        } else {
            this.ball.scale.set(1, 1, 1);
            this.ball.material.color.setHex(0xffffff);
        }
        if (this.ballGlow) this.ballGlow.position.set(x, 0.2, z);

        // Trail
        if (BallPhysics.state === 'flight') {
            this._trailCounter = (this._trailCounter || 0) + 1;
            if (this._trailCounter % 3 === 0) {
                const dot = new THREE.Mesh(
                    new THREE.SphereGeometry(1.5, 4, 4),
                    new THREE.MeshBasicMaterial({ color: 0xffff44, transparent: true, opacity: 0.7 })
                );
                dot.position.set(x, visualY * 0.7, z);
                this.scene.add(dot);
                this.ballTrail.push({ mesh: dot, age: 0 });
            }
        }
        for (let i = this.ballTrail.length - 1; i >= 0; i--) {
            this.ballTrail[i].age += 0.016;
            this.ballTrail[i].mesh.material.opacity = Math.max(0, 0.7 - this.ballTrail[i].age);
            if (this.ballTrail[i].age > 0.7) {
                this.scene.remove(this.ballTrail[i].mesh);
                this.ballTrail[i].mesh.geometry.dispose();
                this.ballTrail[i].mesh.material.dispose();
                this.ballTrail.splice(i, 1);
            }
        }
    },

    setHolePosition(x, z) {
        this._2d.holeX = x;
        this._2d.holeZ = z;
        this._2d.holeVisible = true;

        if (this.use2D || !this.ready) return;
        if (!this.holeGroup) return;
        this.holeGroup.position.set(x, 0, z);
        this.holeGroup.visible = true;
        this._updateFairway(x, z);
    },

    setHoleLabel(name) {
        this._2d.holeName = name;
        if (this.use2D) return;
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
        if (this.fairway) {
            this.scene.remove(this.fairway);
            this.fairway.geometry.dispose();
            this.fairway.material.dispose();
        }
        const bx = BallPhysics.position.x;
        const bz = BallPhysics.position.z;
        const dist = Math.sqrt((hx - bx) ** 2 + (hz - bz) ** 2);
        const angle = Math.atan2(hx - bx, hz - bz);

        this.fairway = new THREE.Mesh(
            new THREE.PlaneGeometry(20, dist + 30),
            new THREE.MeshBasicMaterial({ color: 0x66BB6A })
        );
        this.fairway.rotation.x = -Math.PI / 2;
        this.fairway.rotation.z = -angle;
        this.fairway.position.set((bx + hx) / 2, 0.01, (bz + hz) / 2);
        this.scene.add(this.fairway);
    },

    updateCourseLine(ballPos, holePos) {
        if (this.use2D || !this.ready || !this.courseLine) return;
        const positions = this.courseLine.geometry.attributes.position;
        const segments = 100;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            positions.setXYZ(i, ballPos.x + (holePos.x - ballPos.x) * t, 0.5, ballPos.z + (holePos.z - ballPos.z) * t);
        }
        positions.needsUpdate = true;
        this.courseLine.geometry.setDrawRange(0, segments + 1);
        this.courseLine.computeLineDistances();
        this.courseLine.visible = true;
    },

    updateFlag() {},

    updatePulse(time) {
        if (this.use2D || !this.ready || !this.pulseRing) return;
        const scale = 1 + Math.sin(time * 3) * 0.15;
        this.pulseRing.scale.set(scale, scale, 1);
    },

    showAimLine(ballPos, dirX, dirZ, swipePower, club) {
        if (!this.ready || !club) return;
        if (swipePower < 0.05) { this.hideAim(); return; }

        const actualPower = club.speed * (0.3 + swipePower * 0.7);
        const rad = club.angle * Math.PI / 180;
        const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
        const nx = dirX / len, nz = dirZ / len;

        let vx = nx * Math.cos(rad) * actualPower;
        let vy = Math.sin(rad) * actualPower;
        let vz = nz * Math.cos(rad) * actualPower;
        let px = ballPos.x, py = ballPos.y, pz = ballPos.z;
        const dt = 0.12;
        let landX = px, landZ = pz;

        for (let i = 0; i < 20; i++) {
            vy += -32.2 * dt;
            px += vx * dt;
            py += vy * dt;
            pz += vz * dt;
            if (py <= ballPos.y && i > 0) { landX = px; landZ = pz; break; }
            landX = px; landZ = pz;
        }

        this._2d.aimPower = swipePower;
        this._2d.landX = landX;
        this._2d.landZ = landZ;

        if (this.use2D) return;

        // 3D aim line
        if (this.aimLine) {
            this.aimLine.visible = true;
            const positions = this.aimLine.geometry.attributes.position;
            vx = nx * Math.cos(rad) * actualPower;
            vy = Math.sin(rad) * actualPower;
            vz = nz * Math.cos(rad) * actualPower;
            px = ballPos.x; py = ballPos.y; pz = ballPos.z;
            let count = 0;
            for (let i = 0; i < 20; i++) {
                positions.setXYZ(i, px, (py * 1.5) + 3, pz);
                count++;
                vy += -32.2 * dt;
                px += vx * dt; py += vy * dt; pz += vz * dt;
                if (py <= ballPos.y && i > 0) {
                    for (let j = i + 1; j < 20; j++) { positions.setXYZ(j, px, 1, pz); count++; }
                    break;
                }
            }
            positions.needsUpdate = true;
            this.aimLine.geometry.setDrawRange(0, count || 20);
        }
        if (this.landingMarker) {
            this.landingMarker.visible = true;
            this.landingMarker.position.set(landX, 0.3, landZ);
        }
    },

    hideAim() {
        this._2d.aimPower = 0;
        if (this.aimLine) this.aimLine.visible = false;
        if (this.landingMarker) this.landingMarker.visible = false;
    },

    startIntroAnimation(ballPos, holePos) {
        if (!this.ready) { this.introAnimating = false; return; }
        this.introAnimating = true;
        this.introTimer = 0;
        this.intraBallPos = { x: ballPos.x, z: ballPos.z };
        this.introHolePos = { x: holePos.x, z: holePos.z };

        if (!this.use2D && this.camera) {
            const dist = Math.sqrt((holePos.x - ballPos.x) ** 2 + (holePos.z - ballPos.z) ** 2);
            const fovRad = this.camera.fov * Math.PI / 180;
            const halfExtent = (dist / 2) * 1.4;
            this.introHeight = Math.max(100, halfExtent / Math.tan(fovRad / 2));
            this.camera.position.set(ballPos.x, 60, ballPos.z + 40);
            this.camera.lookAt(ballPos.x, 0, ballPos.z);
        }
    },

    updateIntroAnimation(dt) {
        if (!this.ready || !this.introAnimating) return true;
        this.introTimer += dt;

        if (this.use2D) {
            // 2D: just wait briefly then start
            if (this.introTimer > 0.5) { this.introAnimating = false; return true; }
            return false;
        }

        if (!this.camera) return true;
        const bp = this.intraBallPos;
        const hp = this.introHolePos;
        const midX = (bp.x + hp.x) / 2;
        const midZ = (bp.z + hp.z) / 2;

        if (this.introTimer < 2.0) {
            const target = new THREE.Vector3(midX, this.introHeight, midZ + this.introHeight * 0.15);
            this.camera.position.lerp(target, 0.04);
            this.camera.lookAt(midX, 0, midZ);
        } else {
            this.introAnimating = false;
            return true;
        }
        return false;
    },

    updateCamera(ballPos, holePos, state) {
        if (this.use2D || !this.ready || !this.camera || this.introAnimating) return;
        const midX = (ballPos.x + holePos.x) * 0.5;
        const midZ = (ballPos.z + holePos.z) * 0.5;
        const dist = Math.sqrt((holePos.x - ballPos.x) ** 2 + (holePos.z - ballPos.z) ** 2);
        const zoom = this.zoomLevel || 1.0;

        if (state === 'flight' || state === 'rolling') {
            const height = Math.max(80, dist * 0.8) * zoom;
            this.camera.position.lerp(new THREE.Vector3(midX, height, midZ + height * 0.25), 0.05);
            this.camera.lookAt(midX, 0, midZ);
        } else {
            const fovRad = this.camera.fov * Math.PI / 180;
            const aspect = this.camera.aspect;
            const halfExtent = (dist / 2) * 1.4;
            const heightV = halfExtent / Math.tan(fovRad / 2);
            const heightH = halfExtent / (Math.tan(fovRad / 2) * aspect);
            const height = Math.max(100, Math.max(heightV, heightH)) * zoom;
            this.camera.position.lerp(new THREE.Vector3(midX, height, midZ + height * 0.15), 0.04);
            this.camera.lookAt(midX, 0, midZ);
        }
    },

    drawRouteFairway(routePoints) {
        this._2d.routePoints = routePoints;
        if (this.use2D || !this.ready || !routePoints || routePoints.length < 2) return;

        this._clearRouteFairway();
        this.routeFairwayGroup = new THREE.Group();
        const roadWidth = 22;
        const roadMat = new THREE.MeshBasicMaterial({ color: 0x666666 });
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });

        for (let i = 0; i < routePoints.length - 1; i++) {
            const p0 = routePoints[i], p1 = routePoints[i + 1];
            const dx = p1.x - p0.x, dz = p1.z - p0.z;
            const segLen = Math.sqrt(dx * dx + dz * dz);
            if (segLen < 1) continue;
            const angle = Math.atan2(dx, dz);
            const mx = (p0.x + p1.x) / 2, mz = (p0.z + p1.z) / 2;

            const seg = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, segLen + 2), roadMat);
            seg.rotation.x = -Math.PI / 2;
            seg.rotation.z = -angle;
            seg.position.set(mx, 0.03, mz);
            this.routeFairwayGroup.add(seg);

            if (i % 3 === 0) {
                const px = -Math.cos(angle), pz = Math.sin(angle);
                for (const s of [-1, 1]) {
                    const edge = new THREE.Mesh(new THREE.PlaneGeometry(1.5, Math.min(segLen, 8)), edgeMat);
                    edge.rotation.x = -Math.PI / 2;
                    edge.rotation.z = -angle;
                    edge.position.set(mx + px * (roadWidth / 2) * s, 0.04, mz + pz * (roadWidth / 2) * s);
                    this.routeFairwayGroup.add(edge);
                }
            }
        }
        this.scene.add(this.routeFairwayGroup);
    },

    drawStraightFairway() {
        this._2d.routePoints = null;
        if (!this.use2D) this._clearRouteFairway();
    },

    _clearRouteFairway() {
        if (this.routeFairwayGroup) {
            this.routeFairwayGroup.traverse(c => { if (c.geometry) c.geometry.dispose(); });
            this.scene.remove(this.routeFairwayGroup);
            this.routeFairwayGroup = null;
        }
    },

    setZoom(level) {
        this.zoomTarget = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, level));
    },

    render() {
        this.zoomLevel += (this.zoomTarget - this.zoomLevel) * 0.1;
        if (this.use2D) {
            this._render2D();
        } else if (this.renderer && this.scene && this.camera) {
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
