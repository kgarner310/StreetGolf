// 3D Visuals using Three.js
// Creates golf ball, green, flag, aim line, all in 3D

const Visuals = {
    scene: null,
    camera: null,
    renderer: null,

    ball: null,
    ballTrail: [],
    green: null,
    flagPole: null,
    flagCloth: null,
    aimLine: null,
    landingMarker: null,
    holeGroup: null,

    init() {
        const canvas = document.getElementById('game-canvas');

        this.scene = new THREE.Scene();

        // Camera — perspective, looking down slightly
        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.01, 1000
        );
        this.camera.position.set(0, 2, 3);
        this.camera.lookAt(0, 0, 0);

        // Renderer with transparency (camera shows through)
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(5, 10, 5);
        this.scene.add(sun);

        // Create objects
        this._createBall();
        this._createHole();
        this._createAimLine();

        window.addEventListener('resize', () => this._onResize());
    },

    _createBall() {
        const geo = new THREE.SphereGeometry(0.02, 16, 12);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.15,
            metalness: 0.0
        });
        this.ball = new THREE.Mesh(geo, mat);
        this.ball.castShadow = true;
        this.scene.add(this.ball);
    },

    _createHole() {
        this.holeGroup = new THREE.Group();
        this.scene.add(this.holeGroup);

        // Putting green (disc)
        const greenGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.01, 24);
        const greenMat = new THREE.MeshStandardMaterial({
            color: 0x1a8c27,
            roughness: 0.7
        });
        const greenMesh = new THREE.Mesh(greenGeo, greenMat);
        greenMesh.position.y = 0.005;
        this.green = greenMesh;
        this.holeGroup.add(greenMesh);

        // Hole cup (dark circle)
        const cupGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12);
        const cupMat = new THREE.MeshStandardMaterial({ color: 0x1a0f05 });
        const cup = new THREE.Mesh(cupGeo, cupMat);
        cup.position.y = 0.01;
        this.holeGroup.add(cup);

        // Pulse ring
        const ringGeo = new THREE.RingGeometry(0.5, 0.6, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x44ff66,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        this.pulseRing = new THREE.Mesh(ringGeo, ringMat);
        this.pulseRing.rotation.x = -Math.PI / 2;
        this.pulseRing.position.y = 0.005;
        this.holeGroup.add(this.pulseRing);

        // Flag pole
        const poleGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 6);
        const poleMat = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            metalness: 0.4,
            roughness: 0.4
        });
        this.flagPole = new THREE.Mesh(poleGeo, poleMat);
        this.flagPole.position.y = 0.5;
        this.holeGroup.add(this.flagPole);

        // Flag cloth
        const flagGeo = new THREE.PlaneGeometry(0.18, 0.1, 8, 1);
        const flagMat = new THREE.MeshStandardMaterial({
            color: 0xe81919,
            side: THREE.DoubleSide,
            roughness: 0.8
        });
        this.flagCloth = new THREE.Mesh(flagGeo, flagMat);
        this.flagCloth.position.set(0.095, 0.95, 0);
        this.holeGroup.add(this.flagCloth);

        this.holeGroup.visible = false;
    },

    _createAimLine() {
        // Aim trajectory line
        const lineGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(60 * 3); // 20 segments
        lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const lineMat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        });
        this.aimLine = new THREE.Line(lineGeo, lineMat);
        this.aimLine.visible = false;
        this.scene.add(this.aimLine);

        // Landing marker
        const markerGeo = new THREE.RingGeometry(0.08, 0.12, 12);
        const markerMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        this.landingMarker = new THREE.Mesh(markerGeo, markerMat);
        this.landingMarker.rotation.x = -Math.PI / 2;
        this.landingMarker.visible = false;
        this.scene.add(this.landingMarker);
    },

    updateBall(x, y, z) {
        if (!this.ball) return;
        this.ball.position.set(x, y, z);

        // Trail effect — simple fading spheres
        if (BallPhysics.state === 'flight' || BallPhysics.state === 'rolling') {
            const trailDot = new THREE.Mesh(
                new THREE.SphereGeometry(0.005, 4, 4),
                new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.5
                })
            );
            trailDot.position.set(x, y, z);
            this.scene.add(trailDot);
            this.ballTrail.push({ mesh: trailDot, age: 0 });
        }

        // Fade trail
        for (let i = this.ballTrail.length - 1; i >= 0; i--) {
            this.ballTrail[i].age += 0.016;
            this.ballTrail[i].mesh.material.opacity = Math.max(0, 0.5 - this.ballTrail[i].age);
            if (this.ballTrail[i].age > 0.5) {
                this.scene.remove(this.ballTrail[i].mesh);
                this.ballTrail[i].mesh.geometry.dispose();
                this.ballTrail[i].mesh.material.dispose();
                this.ballTrail.splice(i, 1);
            }
        }
    },

    setHolePosition(x, z) {
        if (!this.holeGroup) return;
        this.holeGroup.position.set(x, 0, z);
        this.holeGroup.visible = true;
    },

    updateFlag(time) {
        if (!this.flagCloth) return;
        // Flutter animation
        const geo = this.flagCloth.geometry;
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const wave = Math.sin(time * 5 + x * 10) * 0.01 * Math.abs(x) * 10;
            pos.setZ(i, wave);
        }
        pos.needsUpdate = true;
    },

    updatePulse(time, distanceFromBall) {
        if (!this.pulseRing) return;
        const proximity = Math.max(0, 1 - distanceFromBall / 5);
        const speed = 2 + proximity * 3;
        const amount = 0.1 + proximity * 0.15;
        const scale = 1 + Math.sin(time * speed) * amount;
        this.pulseRing.scale.set(scale, scale, 1);
        this.pulseRing.material.opacity = 0.3 + proximity * 0.3;
    },

    showAimLine(ballPos, dirX, dirZ, power) {
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
            positions.setXYZ(i, px, py + 0.02, pz);
            count++;

            vy += -9.81 * dt;
            px += vx * dt;
            py += vy * dt;
            pz += vz * dt;

            if (py <= ballPos.y && i > 0) {
                landX = px;
                landZ = pz;
                for (let j = i + 1; j < 20; j++) {
                    positions.setXYZ(j, landX, ballPos.y + 0.02, landZ);
                    count++;
                }
                break;
            }
            landX = px;
            landZ = pz;
        }

        positions.needsUpdate = true;
        this.aimLine.geometry.setDrawRange(0, count || 20);

        // Landing marker
        this.landingMarker.visible = true;
        this.landingMarker.position.set(landX, ballPos.y + 0.01, landZ);
    },

    hideAim() {
        if (this.aimLine) this.aimLine.visible = false;
        if (this.landingMarker) this.landingMarker.visible = false;
    },

    updateCamera(ballPos, holePos, state) {
        if (!this.camera) return;

        if (state === 'flight' || state === 'rolling') {
            // Follow ball from behind and above
            const dx = BallPhysics.velocity.x;
            const dz = BallPhysics.velocity.z;
            const speed = Math.sqrt(dx * dx + dz * dz);
            if (speed > 0.1) {
                const camX = ballPos.x - (dx / speed) * 3;
                const camZ = ballPos.z - (dz / speed) * 3;
                this.camera.position.lerp(
                    new THREE.Vector3(camX, ballPos.y + 2, camZ), 0.05
                );
            }
        } else {
            // Overview: position between ball and hole, looking down
            const midX = (ballPos.x + holePos.x) * 0.5;
            const midZ = (ballPos.z + holePos.z) * 0.5;
            const dist = Math.sqrt(
                (holePos.x - ballPos.x) ** 2 + (holePos.z - ballPos.z) ** 2
            );
            const height = Math.max(2, dist * 0.6);
            const camTarget = new THREE.Vector3(
                midX + 0.5, height, midZ + 2
            );
            this.camera.position.lerp(camTarget, 0.03);
        }

        this.camera.lookAt(ballPos.x, ballPos.y, ballPos.z);
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
