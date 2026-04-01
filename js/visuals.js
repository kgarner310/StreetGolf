// StreetGolf 3D Visuals — Mobile-first minimal scene
// Uses MeshBasicMaterial everywhere (no lighting deps, works on all WebGL)

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
    introBallPos: null,
    introHolePos: null,

    zoomLevel: 1.0,
    zoomTarget: 1.0,
    MIN_ZOOM: 0.3,
    MAX_ZOOM: 2.5,

    ready: false,
    initErrors: [],

    init() {
        const dbg = document.getElementById('debug');
        try {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) { this.initErrors.push('no canvas'); return; }
            if (typeof THREE === 'undefined') { this.initErrors.push('THREE missing'); return; }

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB);
            this.initErrors.push('scene:ok');

            this.camera = new THREE.PerspectiveCamera(
                50, window.innerWidth / window.innerHeight, 1, 8000
            );
            this.camera.position.set(0, 300, 200);
            this.camera.lookAt(0, 0, 0);
            this.initErrors.push('cam:ok');

            // Renderer — no antialias on mobile for reliability
            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: false,
                powerPreference: 'low-power'
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            this.initErrors.push('renderer:ok');

            // Single ambient light (BasicMaterial ignores it but keeps scene bright)
            this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));

            // Ground — simple flat green plane
            var groundGeo = new THREE.PlaneGeometry(3000, 3000);
            var groundMat = new THREE.MeshBasicMaterial({ color: 0x4CAF50 });
            var ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.1;
            this.scene.add(ground);
            this.initErrors.push('ground:ok');

            // Ball
            this._createBall();
            this.initErrors.push('ball:ok');

            // Hole
            this._createHole();
            this.initErrors.push('hole:ok');

            // Aim line
            this._createAimLine();
            this.initErrors.push('aim:ok');

            // Course line
            this._createCourseLine();
            this.initErrors.push('line:ok');

            // A few simple trees (just green cones, 15 total)
            for (var i = 0; i < 15; i++) {
                var tx = (Math.random() - 0.5) * 600;
                var tz = (Math.random() - 0.5) * 600;
                var treeGeo = new THREE.ConeGeometry(4, 10, 6);
                var treeMat = new THREE.MeshBasicMaterial({ color: 0x2E7D32 });
                var tree = new THREE.Mesh(treeGeo, treeMat);
                tree.position.set(tx, 5, tz);
                this.scene.add(tree);
            }
            this.initErrors.push('trees:ok');

            // 4 simple buildings
            var bldgColors = [0xBCAAA4, 0xA1887F, 0x8D6E63, 0x9E9E9E];
            var bldgPositions = [[-60, 40], [80, -20], [-40, -80], [100, 60]];
            for (var b = 0; b < 4; b++) {
                var bGeo = new THREE.BoxGeometry(30, 12, 20);
                var bMat = new THREE.MeshBasicMaterial({ color: bldgColors[b] });
                var bldg = new THREE.Mesh(bGeo, bMat);
                bldg.position.set(bldgPositions[b][0], 6, bldgPositions[b][1]);
                this.scene.add(bldg);
            }
            this.initErrors.push('bldg:ok');

            // Do a test render to confirm WebGL actually works
            this.renderer.render(this.scene, this.camera);
            this.initErrors.push('render:ok');

            window.addEventListener('resize', () => this._onResize());
            this.ready = true;
            this.initErrors.push('READY');
        } catch (e) {
            this.initErrors.push('FAIL:' + e.message);
            this.ready = false;
        }
        // Always show init status
        if (dbg) dbg.textContent = this.initErrors.join(' | ');
    },

    _createBall() {
        var geo = new THREE.SphereGeometry(3, 12, 8);
        var mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.ball = new THREE.Mesh(geo, mat);
        this.ball.position.y = 3;
        this.scene.add(this.ball);

        // Glow ring
        var glowGeo = new THREE.RingGeometry(4, 8, 16);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x44ffaa, transparent: true, opacity: 0.6, side: THREE.DoubleSide
        });
        this.ballGlow = new THREE.Mesh(glowGeo, glowMat);
        this.ballGlow.rotation.x = -Math.PI / 2;
        this.ballGlow.position.y = 0.2;
        this.scene.add(this.ballGlow);
    },

    _createHole() {
        this.holeGroup = new THREE.Group();
        this.scene.add(this.holeGroup);

        // Green circle
        var greenGeo = new THREE.CylinderGeometry(12, 12, 0.3, 16);
        var greenMat = new THREE.MeshBasicMaterial({ color: 0x81C784 });
        this.green = new THREE.Mesh(greenGeo, greenMat);
        this.green.position.y = 0.15;
        this.holeGroup.add(this.green);

        // Hole cup (dark circle)
        var cupGeo = new THREE.CylinderGeometry(2, 2, 0.5, 8);
        var cupMat = new THREE.MeshBasicMaterial({ color: 0x1a0f05 });
        var cup = new THREE.Mesh(cupGeo, cupMat);
        cup.position.y = 0.3;
        this.holeGroup.add(cup);

        // Pulse ring
        var ringGeo = new THREE.RingGeometry(12, 14, 16);
        var ringMat = new THREE.MeshBasicMaterial({
            color: 0x44ff66, transparent: true, opacity: 0.4, side: THREE.DoubleSide
        });
        this.pulseRing = new THREE.Mesh(ringGeo, ringMat);
        this.pulseRing.rotation.x = -Math.PI / 2;
        this.pulseRing.position.y = 0.2;
        this.holeGroup.add(this.pulseRing);

        // Flag pole
        var poleGeo = new THREE.CylinderGeometry(0.3, 0.3, 25, 4);
        var poleMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
        this.flagPole = new THREE.Mesh(poleGeo, poleMat);
        this.flagPole.position.set(0, 12.5, 0);
        this.holeGroup.add(this.flagPole);

        // Flag cloth
        var flagGeo = new THREE.PlaneGeometry(8, 5);
        var flagMat = new THREE.MeshBasicMaterial({ color: 0x4B9CD3, side: THREE.DoubleSide });
        this.flagCloth = new THREE.Mesh(flagGeo, flagMat);
        this.flagCloth.position.set(4.5, 22, 0);
        this.holeGroup.add(this.flagCloth);

        // Label
        this.holeLabelCanvas = document.createElement('canvas');
        this.holeLabelCanvas.width = 512;
        this.holeLabelCanvas.height = 96;
        var labelTex = new THREE.CanvasTexture(this.holeLabelCanvas);
        var labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
        this.holeLabelSprite = new THREE.Sprite(labelMat);
        this.holeLabelSprite.scale.set(50, 10, 1);
        this.holeLabelSprite.position.y = 32;
        this.holeGroup.add(this.holeLabelSprite);

        this.holeGroup.visible = false;
    },

    _createAimLine() {
        var lineGeo = new THREE.BufferGeometry();
        var positions = new Float32Array(60 * 3);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        var lineMat = new THREE.LineBasicMaterial({ color: 0x44ffaa });
        this.aimLine = new THREE.Line(lineGeo, lineMat);
        this.aimLine.visible = false;
        this.scene.add(this.aimLine);

        var markerGeo = new THREE.RingGeometry(2, 3.5, 12);
        var markerMat = new THREE.MeshBasicMaterial({
            color: 0xff4444, transparent: true, opacity: 0.6, side: THREE.DoubleSide
        });
        this.landingMarker = new THREE.Mesh(markerGeo, markerMat);
        this.landingMarker.rotation.x = -Math.PI / 2;
        this.landingMarker.visible = false;
        this.scene.add(this.landingMarker);
    },

    _createCourseLine() {
        var geo = new THREE.BufferGeometry();
        var positions = new Float32Array(200 * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        var mat = new THREE.LineDashedMaterial({
            color: 0xffd740, dashSize: 5, gapSize: 5
        });
        this.courseLine = new THREE.Line(geo, mat);
        this.courseLine.visible = false;
        this.scene.add(this.courseLine);
    },

    // --- Update methods ---

    updateBall(x, y, z) {
        if (!this.ready || !this.ball) return;
        var visualY = y * 1.5 + 3;
        this.ball.position.set(x, visualY, z);

        if (BallPhysics.state === 'flight') {
            var s = 1 + y * 0.02;
            this.ball.scale.set(s, s, s);
            this.ball.material.color.setHex(0xffffaa);
        } else {
            this.ball.scale.set(1, 1, 1);
            this.ball.material.color.setHex(0xffffff);
        }

        if (this.ballGlow) {
            this.ballGlow.position.set(x, 0.2, z);
        }

        // Trail during flight
        if (BallPhysics.state === 'flight') {
            this._trailCounter = (this._trailCounter || 0) + 1;
            if (this._trailCounter % 3 === 0) {
                var dot = new THREE.Mesh(
                    new THREE.SphereGeometry(1.5, 4, 4),
                    new THREE.MeshBasicMaterial({ color: 0xffff44, transparent: true, opacity: 0.7 })
                );
                dot.position.set(x, visualY * 0.7, z);
                this.scene.add(dot);
                this.ballTrail.push({ mesh: dot, age: 0 });
            }
        }

        // Cleanup trail
        for (var i = this.ballTrail.length - 1; i >= 0; i--) {
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
        if (!this.ready || !this.holeGroup) return;
        this.holeGroup.position.set(x, 0, z);
        this.holeGroup.visible = true;
        this._updateFairway(x, z);
    },

    setHoleLabel(name) {
        if (!this.holeLabelCanvas || !this.holeLabelSprite) return;
        var ctx = this.holeLabelCanvas.getContext('2d');
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
        var bx = BallPhysics.position.x;
        var bz = BallPhysics.position.z;
        var dist = Math.sqrt((hx - bx) ** 2 + (hz - bz) ** 2);
        var angle = Math.atan2(hx - bx, hz - bz);

        var fwGeo = new THREE.PlaneGeometry(20, dist + 30);
        var fwMat = new THREE.MeshBasicMaterial({ color: 0x66BB6A });
        this.fairway = new THREE.Mesh(fwGeo, fwMat);
        this.fairway.rotation.x = -Math.PI / 2;
        this.fairway.rotation.z = -angle;
        this.fairway.position.set((bx + hx) / 2, 0.01, (bz + hz) / 2);
        this.scene.add(this.fairway);
    },

    updateCourseLine(ballPos, holePos) {
        if (!this.ready || !this.courseLine) return;
        var positions = this.courseLine.geometry.attributes.position;
        var segments = 100;
        for (var i = 0; i <= segments; i++) {
            var t = i / segments;
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
        // Skip flag animation to reduce mobile load
    },

    updatePulse(time, distanceFromBall) {
        if (!this.ready || !this.pulseRing) return;
        var scale = 1 + Math.sin(time * 3) * 0.15;
        this.pulseRing.scale.set(scale, scale, 1);
    },

    showAimLine(ballPos, dirX, dirZ, swipePower, club) {
        if (!this.ready || !this.aimLine || !this.landingMarker) return;
        if (swipePower < 0.05 || !club) {
            this.aimLine.visible = false;
            this.landingMarker.visible = false;
            return;
        }
        this.aimLine.visible = true;

        var actualPower = club.speed * (0.3 + swipePower * 0.7);
        var rad = club.angle * Math.PI / 180;
        var len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
        var nx = dirX / len;
        var nz = dirZ / len;

        var vx = nx * Math.cos(rad) * actualPower;
        var vy = Math.sin(rad) * actualPower;
        var vz = nz * Math.cos(rad) * actualPower;

        var px = ballPos.x, py = ballPos.y, pz = ballPos.z;
        var positions = this.aimLine.geometry.attributes.position;
        var dt = 0.12;
        var landX = px, landZ = pz;
        var count = 0;

        for (var i = 0; i < 20; i++) {
            positions.setXYZ(i, px, (py * 1.5) + 3, pz);
            count++;
            vy += -32.2 * dt;
            px += vx * dt;
            py += vy * dt;
            pz += vz * dt;
            if (py <= ballPos.y && i > 0) {
                landX = px; landZ = pz;
                for (var j = i + 1; j < 20; j++) {
                    positions.setXYZ(j, landX, 1, landZ);
                    count++;
                }
                break;
            }
            landX = px; landZ = pz;
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

    startIntroAnimation(ballPos, holePos) {
        if (!this.ready || !this.camera) { this.introAnimating = false; return; }
        this.introAnimating = true;
        this.introTimer = 0;
        this.introBallPos = { x: ballPos.x, z: ballPos.z };
        this.introHolePos = { x: holePos.x, z: holePos.z };

        var dist = Math.sqrt((holePos.x - ballPos.x) ** 2 + (holePos.z - ballPos.z) ** 2);
        var fovRad = this.camera.fov * Math.PI / 180;
        var aspect = this.camera.aspect;
        var halfExtent = (dist / 2) * 1.4;
        this.introHeight = Math.max(100, halfExtent / Math.tan(fovRad / 2));

        this.camera.position.set(ballPos.x, 60, ballPos.z + 40);
        this.camera.lookAt(ballPos.x, 0, ballPos.z);
    },

    updateIntroAnimation(dt) {
        if (!this.ready || !this.introAnimating || !this.camera) return true;
        this.introTimer += dt;
        var bp = this.introBallPos;
        var hp = this.introHolePos;
        var midX = (bp.x + hp.x) / 2;
        var midZ = (bp.z + hp.z) / 2;

        if (this.introTimer < 2.0) {
            var targetPos = new THREE.Vector3(midX, this.introHeight, midZ + this.introHeight * 0.15);
            this.camera.position.lerp(targetPos, 0.04);
            this.camera.lookAt(midX, 0, midZ);
        } else {
            this.introAnimating = false;
            return true;
        }
        return false;
    },

    updateCamera(ballPos, holePos, state) {
        if (!this.ready || !this.camera || this.introAnimating) return;
        var midX = (ballPos.x + holePos.x) * 0.5;
        var midZ = (ballPos.z + holePos.z) * 0.5;
        var dist = Math.sqrt((holePos.x - ballPos.x) ** 2 + (holePos.z - ballPos.z) ** 2);
        var zoom = this.zoomLevel || 1.0;

        if (state === 'flight' || state === 'rolling') {
            var height = Math.max(80, dist * 0.8) * zoom;
            var target = new THREE.Vector3(midX, height, midZ + height * 0.25);
            this.camera.position.lerp(target, 0.05);
            this.camera.lookAt(midX, 0, midZ);
        } else {
            var fovRad = this.camera.fov * Math.PI / 180;
            var aspect = this.camera.aspect;
            var halfExtent = (dist / 2) * 1.4;
            var heightV = halfExtent / Math.tan(fovRad / 2);
            var heightH = halfExtent / (Math.tan(fovRad / 2) * aspect);
            var height = Math.max(100, Math.max(heightV, heightH)) * zoom;
            var target = new THREE.Vector3(midX, height, midZ + height * 0.15);
            this.camera.position.lerp(target, 0.04);
            this.camera.lookAt(midX, 0, midZ);
        }
    },

    // Route fairway from OSRM driving directions
    drawRouteFairway(routePoints) {
        if (!this.ready || !routePoints || routePoints.length < 2) return;
        this._clearRouteFairway();
        this.routeFairwayGroup = new THREE.Group();

        var roadWidth = 22;
        // Reuse materials
        var roadMat = new THREE.MeshBasicMaterial({ color: 0x666666 });
        var edgeMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
        var centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        for (var i = 0; i < routePoints.length - 1; i++) {
            var p0 = routePoints[i];
            var p1 = routePoints[i + 1];
            var dx = p1.x - p0.x;
            var dz = p1.z - p0.z;
            var segLen = Math.sqrt(dx * dx + dz * dz);
            if (segLen < 1) continue;

            var angle = Math.atan2(dx, dz);
            var mx = (p0.x + p1.x) / 2;
            var mz = (p0.z + p1.z) / 2;

            // Road surface
            var segGeo = new THREE.PlaneGeometry(roadWidth, segLen + 2);
            var seg = new THREE.Mesh(segGeo, roadMat);
            seg.rotation.x = -Math.PI / 2;
            seg.rotation.z = -angle;
            seg.position.set(mx, 0.03, mz);
            this.routeFairwayGroup.add(seg);

            // Yellow edge lines
            if (i % 3 === 0) {
                var perpX = -Math.cos(angle);
                var perpZ = Math.sin(angle);
                for (var s = -1; s <= 1; s += 2) {
                    var eGeo = new THREE.PlaneGeometry(1.5, Math.min(segLen, 8));
                    var edge = new THREE.Mesh(eGeo, edgeMat);
                    edge.rotation.x = -Math.PI / 2;
                    edge.rotation.z = -angle;
                    edge.position.set(mx + perpX * (roadWidth / 2) * s, 0.04, mz + perpZ * (roadWidth / 2) * s);
                    this.routeFairwayGroup.add(edge);
                }
            }

            // White center dashes
            if (i % 5 === 0) {
                var cGeo = new THREE.PlaneGeometry(1.5, Math.min(segLen, 6));
                var center = new THREE.Mesh(cGeo, centerMat);
                center.rotation.x = -Math.PI / 2;
                center.rotation.z = -angle;
                center.position.set(mx, 0.05, mz);
                this.routeFairwayGroup.add(center);
            }
        }
        this.scene.add(this.routeFairwayGroup);
    },

    drawStraightFairway() {
        if (!this.ready) return;
        this._clearRouteFairway();
    },

    _clearRouteFairway() {
        if (this.routeFairwayGroup) {
            this.routeFairwayGroup.traverse(function(child) {
                if (child.geometry) child.geometry.dispose();
            });
            this.scene.remove(this.routeFairwayGroup);
            this.routeFairwayGroup = null;
        }
    },

    setZoom(level) {
        this.zoomTarget = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, level));
    },

    render() {
        if (this.renderer && this.scene && this.camera) {
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
