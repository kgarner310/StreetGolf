// UI Manager
// Updates HUD elements, score panel, status text

const UI = {
    els: {},

    init() {
        this.els = {
            holeNumber: document.getElementById('hole-number'),
            holeName: document.getElementById('hole-name'),
            parDisplay: document.getElementById('par-display'),
            distance: document.getElementById('distance-display'),
            status: document.getElementById('status-text'),
            reticle: document.getElementById('aim-reticle'),
            strokeCount: document.getElementById('stroke-count'),
            powerFill: document.getElementById('power-fill'),
            powerPercent: document.getElementById('power-percent'),
            compass: document.getElementById('compass-arrow'),
            compassDist: document.getElementById('compass-dist'),
            holeComplete: document.getElementById('hole-complete'),
            scoreName: document.getElementById('score-name'),
            scoreStrokes: document.getElementById('score-strokes'),
            scoreCompare: document.getElementById('score-compare'),
            scoreTotal: document.getElementById('score-total'),
            scoreDistance: document.getElementById('score-distance'),
            landmarkPlayed: document.getElementById('landmark-played'),
            nextHoleBtn: document.getElementById('next-hole-btn'),
            startScreen: document.getElementById('start-screen'),
            startBtn: document.getElementById('start-btn'),
            loading: document.getElementById('loading'),
            loadingText: document.getElementById('loading-text'),
        };
    },

    setHoleInfo(number, name, par) {
        this.els.holeNumber.textContent = `HOLE ${number}`;
        this.els.holeName.textContent = name || '';
        this.els.parDisplay.textContent = `PAR ${par}`;
    },

    setDistance(meters) {
        if (meters >= 1000) {
            this.els.distance.textContent = `${(meters / 1000).toFixed(1)} km`;
        } else {
            this.els.distance.textContent = `${Math.round(meters)} m`;
        }
    },

    setStatus(text) {
        this.els.status.textContent = text;
    },

    setStrokes(count) {
        this.els.strokeCount.textContent = `Strokes: ${count}`;
    },

    setPower(normalized) {
        this.els.powerFill.style.width = `${normalized * 100}%`;
        this.els.powerPercent.textContent = `${Math.round(normalized * 100)}%`;
    },

    showReticle() { this.els.reticle.classList.remove('hidden'); },
    hideReticle() { this.els.reticle.classList.add('hidden'); },

    showCompass(bearing, distance) {
        this.els.compass.classList.remove('hidden');
        this.els.compass.style.transform =
            `translateX(-50%) rotate(${bearing}deg)`;
        this.els.compassDist.textContent = `${Math.round(distance)}m`;
    },
    hideCompass() { this.els.compass.classList.add('hidden'); },

    showLoading(text) {
        this.els.loading.classList.remove('hidden');
        this.els.loadingText.textContent = text;
    },
    hideLoading() { this.els.loading.classList.add('hidden'); },

    showStartScreen() { this.els.startScreen.classList.remove('hidden'); },
    hideStartScreen() { this.els.startScreen.classList.add('hidden'); },

    showHoleComplete(result) {
        this.els.holeComplete.classList.remove('hidden');

        const scoreName = this.els.scoreName;
        scoreName.textContent = result.scoreName;
        scoreName.className = '';

        const diff = result.strokes - result.par;
        if (diff <= -2) scoreName.classList.add('score-eagle');
        else if (diff === -1) scoreName.classList.add('score-birdie');
        else if (diff === 0) scoreName.classList.add('score-par');
        else scoreName.classList.add('score-bogey');

        this.els.scoreStrokes.textContent = result.strokes;

        if (diff === 0) this.els.scoreCompare.textContent = 'Even';
        else if (diff > 0) this.els.scoreCompare.textContent = `+${diff}`;
        else this.els.scoreCompare.textContent = `${diff}`;

        this.els.scoreTotal.textContent = `Total: ${result.totalStrokes}`;
        this.els.scoreDistance.textContent = `${Math.round(result.distance)}m hole`;
        this.els.landmarkPlayed.textContent = result.landmarkName || '';
    },

    hideHoleComplete() { this.els.holeComplete.classList.add('hidden'); },

    setUniversityName(name) {
        const el = document.getElementById('university-name');
        if (el) el.textContent = name;
    },

    // Haptic feedback
    vibrate(ms = 20) {
        if (navigator.vibrate) navigator.vibrate(ms);
    }
};
