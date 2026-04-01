// Landmark Service
// Finds nearest university/college and campus POIs using OpenStreetMap Overpass API

const Landmarks = {
    cache: null,
    cacheCenter: null,
    played: new Set(),

    // Find the nearest university or college to the player
    async findNearestUniversity(center) {
        const query = `[out:json][timeout:25];(
node["amenity"="university"](around:40000,${center.lat.toFixed(6)},${center.lon.toFixed(6)});
way["amenity"="university"](around:40000,${center.lat.toFixed(6)},${center.lon.toFixed(6)});
node["amenity"="college"](around:40000,${center.lat.toFixed(6)},${center.lon.toFixed(6)});
way["amenity"="college"](around:40000,${center.lat.toFixed(6)},${center.lon.toFixed(6)});
);out center body 10;`;

        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.elements || data.elements.length === 0) return null;

            const universities = data.elements
                .filter(el => el.tags && el.tags.name)
                .map(el => {
                    const lat = el.center ? el.center.lat : el.lat;
                    const lon = el.center ? el.center.lon : el.lon;
                    return {
                        name: el.tags.name,
                        position: { lat, lon, alt: 0 },
                        distance: GPS.distanceBetween(center, { lat, lon })
                    };
                })
                .sort((a, b) => a.distance - b.distance);

            if (universities.length > 0) {
                console.log(`StreetGolf: Nearest university: ${universities[0].name} (${Math.round(universities[0].distance)}m)`);
                return universities[0];
            }
            return null;
        } catch (err) {
            console.warn('University search failed:', err.message);
            return null;
        }
    },

    // Search for interesting POIs near a university campus
    async searchNearUniversity(center, radiusMeters = 800) {
        if (this.cache && this.cacheCenter &&
            GPS.distanceBetween(center, this.cacheCenter) < 200) {
            return this.cache;
        }

        const query = this._buildCampusQuery(center, radiusMeters);
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const landmarks = this._parseResponse(data, center);

            this.cache = landmarks;
            this.cacheCenter = { ...center };

            console.log(`StreetGolf: Found ${landmarks.length} campus landmarks`);
            return landmarks;
        } catch (err) {
            console.warn('Campus landmark search failed:', err.message);
            return null;
        }
    },

    async searchNearby(center, radiusMeters) {
        return this.searchNearUniversity(center, radiusMeters);
    },

    selectForHole(holeNumber, landmarks) {
        if (!landmarks || landmarks.length === 0) return null;
        return landmarks[(holeNumber - 1) % landmarks.length];
    },

    _buildCampusQuery(center, radius) {
        const lat = center.lat.toFixed(6);
        const lon = center.lon.toFixed(6);
        return `[out:json][timeout:10];(
node["tourism"](around:${radius},${lat},${lon});
node["amenity"~"library|place_of_worship|theatre|fountain|arts_centre"](around:${radius},${lat},${lon});
node["leisure"~"park|garden|pitch|stadium"](around:${radius},${lat},${lon});
node["historic"](around:${radius},${lat},${lon});
node["building"~"university|chapel|stadium"](around:${radius},${lat},${lon});
node["man_made"="tower"](around:${radius},${lat},${lon});
);out body 30;`;
    },

    _parseResponse(data, origin) {
        if (!data.elements) return [];

        return data.elements
            .filter(el => el.tags && el.tags.name)
            .map(el => ({
                name: el.tags.name,
                category: el.tags.tourism || el.tags.amenity || el.tags.leisure ||
                    el.tags.historic || el.tags.building || 'landmark',
                position: { lat: el.lat, lon: el.lon, alt: 0 },
                distance: GPS.distanceBetween(origin, { lat: el.lat, lon: el.lon })
            }))
            .sort((a, b) => a.distance - b.distance);
    },

    _key(lm) {
        return `${lm.position.lat.toFixed(5)}_${lm.position.lon.toFixed(5)}`;
    }
};
