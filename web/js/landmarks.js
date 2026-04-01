// Landmark Service
// Searches nearby POIs using OpenStreetMap Overpass API

const Landmarks = {
    cache: null,
    cacheCenter: null,
    played: new Set(),

    async searchNearby(center, radiusMeters = 500) {
        // Use cache if valid
        if (this.cache && this.cacheCenter &&
            GPS.distanceBetween(center, this.cacheCenter) < 200) {
            return this.cache;
        }

        const query = this._buildQuery(center, radiusMeters);
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const landmarks = this._parseResponse(data, center);

            this.cache = landmarks;
            this.cacheCenter = { ...center };

            console.log(`StreetGolf: Found ${landmarks.length} landmarks`);
            return landmarks;
        } catch (err) {
            console.warn('Landmark search failed:', err.message);
            return null;
        }
    },

    selectForHole(holeNumber, landmarks, minDist = 20, maxDist = 500) {
        if (!landmarks || landmarks.length === 0) return null;

        let candidates = landmarks.filter(lm =>
            lm.distance >= minDist &&
            lm.distance <= maxDist &&
            !this.played.has(this._key(lm))
        );

        // Reset if all played
        if (candidates.length === 0) {
            this.played.clear();
            candidates = landmarks.filter(lm =>
                lm.distance >= minDist && lm.distance <= maxDist
            );
        }

        if (candidates.length === 0) return null;

        // Sort by distance, pick based on hole number
        candidates.sort((a, b) => a.distance - b.distance);
        const index = Math.min(holeNumber - 1, candidates.length - 1);
        const selected = candidates[index];
        this.played.add(this._key(selected));

        return selected;
    },

    _buildQuery(center, radius) {
        const lat = center.lat.toFixed(6);
        const lon = center.lon.toFixed(6);
        return `[out:json][timeout:10];(
node["tourism"](around:${radius},${lat},${lon});
node["amenity"~"restaurant|cafe|bar|bank|library|place_of_worship|theatre|cinema|fountain|memorial"](around:${radius},${lat},${lon});
node["leisure"~"park|playground|garden|pitch"](around:${radius},${lat},${lon});
node["historic"](around:${radius},${lat},${lon});
);out body 25;`;
    },

    _parseResponse(data, origin) {
        if (!data.elements) return [];

        return data.elements
            .filter(el => el.tags && el.tags.name)
            .map(el => ({
                name: el.tags.name,
                category: el.tags.tourism || el.tags.amenity || el.tags.leisure || el.tags.historic || 'landmark',
                position: { lat: el.lat, lon: el.lon, alt: 0 },
                distance: GPS.distanceBetween(origin, { lat: el.lat, lon: el.lon })
            }))
            .sort((a, b) => a.distance - b.distance);
    },

    _key(lm) {
        return `${lm.position.lat.toFixed(5)}_${lm.position.lon.toFixed(5)}`;
    }
};
