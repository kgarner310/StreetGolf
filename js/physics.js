// Golf Ball Physics
// Handles flight, bounce, rolling, and rest detection

const BallPhysics = {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    groundY: 0,
    state: 'placed', // placed, flight, rolling, resting, inHole

    GRAVITY: -9.81,
    GROUND_FRICTION: 2.5,
    BOUNCINESS: 0.4,
    AIR_RESISTANCE: 0.01,
    MAX_SPEED: 30,
    MIN_VELOCITY: 0.05,

    shotCount: 0,

    placeAt(x, y, z) {
        this.position = { x, y: y || 0, z };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.groundY = y || 0;
        this.state = 'placed';
    },

    hit(dirX, dirZ, power, launchAngle = 25) {
        if (this.state === 'flight' || this.state === 'rolling') return;

        const rad = launchAngle * Math.PI / 180;
        const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
        const nx = dirX / len;
        const nz = dirZ / len;

        this.velocity = {
            x: nx * Math.cos(rad) * power,
            y: Math.sin(rad) * power,
            z: nz * Math.cos(rad) * power
        };

        this.state = 'flight';
        this.shotCount++;
    },

    update(dt) {
        if (this.state !== 'flight' && this.state !== 'rolling') return;

        // Gravity
        if (this.state === 'flight') {
            this.velocity.y += this.GRAVITY * dt;
        }

        // Air resistance
        const drag = 1 - this.AIR_RESISTANCE * dt;
        this.velocity.x *= drag;
        this.velocity.y *= drag;
        this.velocity.z *= drag;

        // Clamp speed
        const speed = Math.sqrt(
            this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2
        );
        if (speed > this.MAX_SPEED) {
            const s = this.MAX_SPEED / speed;
            this.velocity.x *= s;
            this.velocity.y *= s;
            this.velocity.z *= s;
        }

        // Move
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // Ground collision
        if (this.position.y <= this.groundY) {
            this.position.y = this.groundY;

            if (this.state === 'flight') {
                const impactSpeed = Math.abs(this.velocity.y);
                this.velocity.y = impactSpeed * this.BOUNCINESS;
                this.velocity.x *= 0.8;
                this.velocity.z *= 0.8;

                if (impactSpeed < 0.5) {
                    this.velocity.y = 0;
                    this.state = 'rolling';
                }
            }
        }

        // Ground friction (rolling)
        if (this.state === 'rolling') {
            const fric = 1 - this.GROUND_FRICTION * dt;
            this.velocity.x *= fric;
            this.velocity.z *= fric;
            this.velocity.y = 0;
        }

        // Rest detection
        const hSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        if ((this.state === 'rolling' || this.state === 'flight') &&
            hSpeed < this.MIN_VELOCITY && Math.abs(this.velocity.y) < this.MIN_VELOCITY) {
            this.velocity = { x: 0, y: 0, z: 0 };
            this.state = 'resting';
            return 'resting';
        }

        return null;
    },

    distanceTo(targetX, targetZ) {
        const dx = this.position.x - targetX;
        const dz = this.position.z - targetZ;
        return Math.sqrt(dx * dx + dz * dz);
    },

    reset() {
        this.shotCount = 0;
    },

    sink() {
        this.state = 'inHole';
        this.velocity = { x: 0, y: 0, z: 0 };
    }
};
