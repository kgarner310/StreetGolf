// UI Manager
// Updates HUD elements, score panel, club display, status text

const UI = {
    els: {},

    init() {
        this.els = {
            holeNumber: document.getElementById('hole-number'),
            holeName: document.getElementById('hole-name'),
            parDisplay: document.getElementById('par-display'),
            distance: document.getElementById('distance-display'),
            distanceUnit: document.getElementById('distance-unit'),
            status: document.getElementById('status-text'),
            reticle: document.getElementById('aim-reticle'),
            strokeCount: document.getElementById('stroke-count'),
            clubName: document.getElementById('club-name'),
            powerFill: document.getElementById('power-fill'),
            powerPercent: document.getElementById('power-percent'),
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

    setDistanceYards(yards) {
        this.els.distance.textContent = Math.round(yards);
        if (this.els.distanceUnit) this.els.distanceUnit.textContent = 'YDS';
    },

    setStatus(text) {
        this.els.status.textContent = text;
    },

    setStrokes(count) {
        this.els.strokeCount.textContent = `Strokes: ${count}`;
    },

    setClub(clubName) {
        if (this.els.clubName) this.els.clubName.textContent = clubName;
    },

    setPower(normalized) {
        this.els.powerFill.style.width = `${normalized * 100}%`;
        this.els.powerPercent.textContent = `${Math.round(normalized * 100)}%`;
    },

    showReticle() { this.els.reticle.classList.remove('hidden'); },
    hideReticle() { this.els.reticle.classList.add('hidden'); },

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
        this.els.scoreDistance.textContent = `${Math.round(result.distance)} yd hole`;
        this.els.landmarkPlayed.textContent = result.landmarkName || '';
    },

    hideHoleComplete() { this.els.holeComplete.classList.add('hidden'); },

    setUniversityName(name) {
        const el = document.getElementById('university-name');
        if (el) el.textContent = name;
    },

    vibrate(ms = 20) {
        if (navigator.vibrate) navigator.vibrate(ms);
    }
};
