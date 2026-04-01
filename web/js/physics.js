// Golf Ball Physics
// Club-specific flight, bounce, rolling, and rest detection
// 1 unit = 1 yard in the game world

const BallPhysics = {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    groundY: 0,
    state: 'placed', // placed, flight, rolling, resting, inHole

    GRAVITY: -32.2,       // ft/s² converted roughly for yard-scale
    GROUND_FRICTION: 3.0,
    BOUNCINESS: 0.35,
    AIR_RESISTANCE: 0.008,
    MAX_SPEED: 120,
    MIN_VELOCITY: 0.3,

    shotCount: 0,

    // Club definitions: maxYards, launchAngle (degrees), ballSpeed (yards/s)
    CLUBS: {
        'Driver':   { maxYards: 300, angle: 11,  speed: 85 },
        '3 Wood':   { maxYards: 250, angle: 14,  speed: 75 },
        '5 Iron':   { maxYards: 200, angle: 21,  speed: 62 },
        '7 Iron':   { maxYards: 165, angle: 27,  speed: 52 },
        '9 Iron':   { maxYards: 135, angle: 34,  speed: 42 },
        'PW':       { maxYards: 110, angle: 42,  speed: 35 },
        'Putter':   { maxYards: 50,  angle: 2,   speed: 15 }
    },

    currentClub: 'Driver',

    // Select best club for distance (in yards)
    selectClub(distYards) {
        if (distYards <= 30)  return 'Putter';
        if (distYards <= 100) return 'PW';
        if (distYards <= 130) return '9 Iron';
        if (distYards <= 165) return '7 Iron';
        if (distYards <= 200) return '5 Iron';
        if (distYards <= 250) return '3 Wood';
        return 'Driver';
    },

    placeAt(x, y, z) {
        this.position = { x, y: y || 0, z };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.groundY = y || 0;
        this.state = 'placed';
    },

    // Hit with current club. swipePower is 0-1 from the player's swipe.
    hit(dirX, dirZ, swipePower) {
        if (this.state === 'flight' || this.state === 'rolling') return;

        const club = this.CLUBS[this.currentClub];
        const power = club.speed * (0.3 + swipePower * 0.7); // 30-100% of club speed
        const rad = club.angle * Math.PI / 180;

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

                if (impactSpeed < 1.5) {
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

    // Peak height of current trajectory
    peakHeight() {
        if (this.state !== 'flight') return 0;
        return this.position.y;
    },

    reset() {
        this.shotCount = 0;
    },

    sink() {
        this.state = 'inHole';
        this.velocity = { x: 0, y: 0, z: 0 };
    }
};
