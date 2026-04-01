// GPS Location Service
// Tracks player position, converts GPS coords to local meters

const GPS = {
    startPosition: null,
    currentPosition: null,
    watchId: null,
    hasFix: false,
    onUpdate: null,
    onError: null,

    METERS_PER_DEG_LAT: 111320,

    start() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            // Get initial position
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.startPosition = {
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        alt: pos.coords.altitude || 0
                    };
                    this.currentPosition = { ...this.startPosition };
                    this.hasFix = true;

                    // Start watching
                    this.watchId = navigator.geolocation.watchPosition(
                        (p) => this._onPosition(p),
                        (e) => { if (this.onError) this.onError(e); },
                        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
                    );

                    resolve(this.startPosition);
                },
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 15000 }
            );
        });
    },

    stop() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    },

    _onPosition(pos) {
        this.currentPosition = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            alt: pos.coords.altitude || 0
        };
        this.hasFix = true;
        if (this.onUpdate) this.onUpdate(this.currentPosition);
    },

    // Convert GPS position to local XZ meters relative to start
    toLocal(gpsPos) {
        if (!this.startPosition) return { x: 0, y: 0, z: 0 };

        const latDiff = gpsPos.lat - this.startPosition.lat;
        const lonDiff = gpsPos.lon - this.startPosition.lon;
        const metersPerDegLon = this.METERS_PER_DEG_LAT *
            Math.cos(this.startPosition.lat * Math.PI / 180);

        return {
            x: lonDiff * metersPerDegLon,
            y: (gpsPos.alt || 0) - (this.startPosition.alt || 0),
            z: latDiff * this.METERS_PER_DEG_LAT
        };
    },

    // Convert local XZ meters back to GPS
    toGPS(localPos) {
        if (!this.startPosition) return { lat: 0, lon: 0, alt: 0 };

        const metersPerDegLon = this.METERS_PER_DEG_LAT *
            Math.cos(this.startPosition.lat * Math.PI / 180);

        return {
            lat: this.startPosition.lat + localPos.z / this.METERS_PER_DEG_LAT,
            lon: this.startPosition.lon + localPos.x / metersPerDegLon,
            alt: this.startPosition.alt + (localPos.y || 0)
        };
    },

    // Distance between two GPS positions in meters
    distanceBetween(a, b) {
        const latDiff = (b.lat - a.lat) * this.METERS_PER_DEG_LAT;
        const metersPerDegLon = this.METERS_PER_DEG_LAT *
            Math.cos(a.lat * Math.PI / 180);
        const lonDiff = (b.lon - a.lon) * metersPerDegLon;
        return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
    },

    // Distance from current position to target
    distanceTo(gpsPos) {
        if (!this.currentPosition) return 0;
        return this.distanceBetween(this.currentPosition, gpsPos);
    },

    // Bearing from current position to target (degrees)
    bearingTo(gpsPos) {
        if (!this.currentPosition) return 0;
        const local = this.toLocal(gpsPos);
        const playerLocal = this.toLocal(this.currentPosition);
        const dx = local.x - playerLocal.x;
        const dz = local.z - playerLocal.z;
        return Math.atan2(dx, dz);
    }
};
