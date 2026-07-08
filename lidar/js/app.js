// LiDARy — Google-Earth-style North America LiDAR explorer.
// Self-contained canvas globe (no external map tiles / CDNs).
(function () {
  'use strict';
  var D2R = Geo.D2R;
  var QCOLOR = window.LIDAR_QL_COLOR, QWEIGHT = window.LIDAR_QL_WEIGHT;
  var DATA = window.LIDAR_REGIONS, SOURCES = window.LIDAR_SOURCES, GAPS = window.LIDAR_GAPS;

  // ---- prepare features: attach lidar data + geometry meta ----
  var feats = [];
  window.REGIONS_GEOJSON.features.forEach(function (f) {
    var d = DATA[f.properties.id];
    if (!d) return;                       // only keep regions we have data for
    var m = Geo.geomMeta(f.geometry);
    feats.push({
      id: f.properties.id, name: f.properties.name, country: f.properties.country,
      geom: f.geometry, data: d, centroid: m.centroid, bbox: m.bbox
    });
  });
  feats.sort(function (a, b) { return (a.bbox[3] - a.bbox[1]) * (a.bbox[2] - a.bbox[0]) >
                                      (b.bbox[3] - b.bbox[1]) * (b.bbox[2] - b.bbox[0]) ? -1 : 1; });

  var CTRY = { US: 'United States', CA: 'Canada', MX: 'Mexico', GL: 'Greenland',
    PR: 'Puerto Rico (US)', BZ: 'Belize', GT: 'Guatemala', HN: 'Honduras', SV: 'El Salvador',
    NI: 'Nicaragua', CR: 'Costa Rica', PA: 'Panama', CU: 'Cuba', HT: 'Haiti', DO: 'Dominican Rep.',
    JM: 'Jamaica', BS: 'Bahamas', TT: 'Trinidad & Tobago', BM: 'Bermuda' };

  // ---- canvas / projection ----
  var cv = document.getElementById('globe'), ctx = cv.getContext('2d');
  var proj = new Geo.Projection();
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var state = { mode: 'score', grat: true, spin: false, gapsOnly: false,
                hover: null, selected: null };
  var anim = null;

  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    proj.cx = W / 2; proj.cy = H / 2;
    if (!proj._userScale) proj.scale = Math.min(W, H) * 0.42;
    draw();
  }
  window.addEventListener('resize', resize);

  // ---- color logic ----
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function rgb(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
  // sequential ramp red -> amber -> lime -> emerald for 0..100
  var RAMP = [[0.0, '#7a2b2b'], [0.25, '#e8663c'], [0.5, '#f2b134'], [0.75, '#cfe23c'], [1.0, '#3fe0a0']];
  function rampColor(t) {
    t = Math.max(0, Math.min(1, t));
    for (var i = 1; i < RAMP.length; i++) {
      if (t <= RAMP[i][0]) {
        var a = RAMP[i - 1], b = RAMP[i], f = (t - a[0]) / (b[0] - a[0]);
        var ca = hex2rgb(a[1]), cb = hex2rgb(b[1]);
        return rgb([lerp(ca[0], cb[0], f) | 0, lerp(ca[1], cb[1], f) | 0, lerp(ca[2], cb[2], f) | 0]);
      }
    }
    return RAMP[RAMP.length - 1][1];
  }
  function fillFor(f) {
    var d = f.data;
    if (state.gapsOnly) {
      if (d.score >= 70) return 'rgba(70,90,120,.25)';
      return rampColor(d.score / 100);
    }
    if (state.mode === 'tier') return QCOLOR[d.q] || '#555';
    if (state.mode === 'cov') return rampColor(d.cov / 100);
    return rampColor(d.score / 100);         // detail index
  }

  // ---- drawing ----
  function ringPath(ring) {
    var started = false;
    for (var i = 0; i < ring.length; i++) {
      var p = proj.project(ring[i][0], ring[i][1]);
      var x = p.x, y = p.y;
      if (!p.visible && !proj.flat) {        // clamp hidden vertex to the limb
        var dx = x - proj.cx, dy = y - proj.cy, r = Math.sqrt(dx * dx + dy * dy) || 1;
        x = proj.cx + dx / r * proj.scale; y = proj.cy + dy / r * proj.scale;
      }
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
  }
  function geomPath(geom) {
    var polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    for (var p = 0; p < polys.length; p++)
      for (var r = 0; r < polys[p].length; r++) ringPath(polys[p][r]);
  }
  function frontFacing(f) {
    if (proj.flat) return true;
    var c = proj.project(f.centroid[0], f.centroid[1]);
    return c.visible;
  }

  function drawGraticule() {
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    var lon, lat, first, p;
    for (lon = -180; lon <= 180; lon += 30) {
      ctx.beginPath(); first = true;
      for (lat = -90; lat <= 90; lat += 4) {
        p = proj.project(lon, lat);
        if (proj.flat || p.visible) { if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y); }
        else first = true;
      }
      ctx.stroke();
    }
    for (lat = -60; lat <= 80; lat += 30) {
      ctx.beginPath(); first = true;
      for (lon = -180; lon <= 180; lon += 4) {
        p = proj.project(lon, lat);
        if (proj.flat || p.visible) { if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y); }
        else first = true;
      }
      ctx.stroke();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // space background
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#05070d'); bg.addColorStop(1, '#0a1020');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    if (!proj.flat) {
      // atmosphere glow
      var glow = ctx.createRadialGradient(proj.cx, proj.cy, proj.scale * 0.9, proj.cx, proj.cy, proj.scale * 1.18);
      glow.addColorStop(0, 'rgba(78,163,255,.35)'); glow.addColorStop(1, 'rgba(78,163,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(proj.cx, proj.cy, proj.scale * 1.18, 0, 7); ctx.fill();
      // ocean sphere
      var oc = ctx.createRadialGradient(proj.cx - proj.scale * .3, proj.cy - proj.scale * .35, proj.scale * .1,
                                        proj.cx, proj.cy, proj.scale);
      oc.addColorStop(0, '#16324f'); oc.addColorStop(.7, '#0e2138'); oc.addColorStop(1, '#081726');
      ctx.fillStyle = oc;
      ctx.beginPath(); ctx.arc(proj.cx, proj.cy, proj.scale, 0, 7); ctx.fill();
      // clip subsequent land to the sphere
      ctx.save(); ctx.beginPath(); ctx.arc(proj.cx, proj.cy, proj.scale, 0, 7); ctx.clip();
    } else {
      // flat ocean panel
      ctx.fillStyle = '#0e2138';
      var s = proj.scale * proj.flatZoom;
      var oy = proj.cy - (90 * D2R) * s / Math.PI + proj.flatY;
      var oh = (180 * D2R) * s / Math.PI;
      ctx.fillRect(0, oy, W, oh);
    }

    if (state.grat) drawGraticule();

    // regions
    for (var i = 0; i < feats.length; i++) {
      var f = feats[i];
      if (!frontFacing(f)) continue;
      ctx.beginPath(); geomPath(f.geom);
      ctx.fillStyle = fillFor(f);
      ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
    }
    // hover + selected outlines on top
    [state.hover, state.selected].forEach(function (f, idx) {
      if (!f || !frontFacing(f)) return;
      ctx.beginPath(); geomPath(f.geom);
      if (idx === 1) { ctx.lineWidth = 2.4; ctx.strokeStyle = '#ffffff'; ctx.stroke();
                       ctx.lineWidth = 4.5; ctx.strokeStyle = 'rgba(78,163,255,.45)'; ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
             ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke(); }
    });

    if (!proj.flat) ctx.restore();
  }

  // ---- hit testing ----
  function pick(x, y) {
    var ll = proj.invert(x, y);
    if (!ll) return null;
    for (var i = feats.length - 1; i >= 0; i--) {   // smaller (later) first
      var f = feats[i];
      if (!frontFacing(f)) continue;
      if (ll.lon < f.bbox[0] - 1 || ll.lon > f.bbox[2] + 1 || ll.lat < f.bbox[1] - 1 || ll.lat > f.bbox[3] + 1) continue;
      if (Geo.pointInGeom(ll.lon, ll.lat, f.geom)) return f;
    }
    return null;
  }

  // ---- interaction ----
  var drag = null;
  cv.addEventListener('pointerdown', function (e) {
    cv.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, l: proj.lambda0, p: proj.phi0,
             fx: proj.flatX, fy: proj.flatY, moved: 0 };
    state.spin = false; document.getElementById('spin').checked = false;
    if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
  });
  cv.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (proj.flat) { proj.flatX = drag.fx + dx; proj.flatY = drag.fy + dy; }
      else {
        proj.lambda0 = drag.l + dx * 0.0045 / (proj.scale / 300);
        proj.phi0 = Math.max(-1.45, Math.min(1.45, drag.p + dy * 0.0045 / (proj.scale / 300)));
      }
      draw(); hideTip(); return;
    }
    // hover
    var f = pick(mx, my);
    if (f !== state.hover) { state.hover = f; draw(); }
    if (f) showTip(mx, my, f); else hideTip();
    cv.style.cursor = f ? 'pointer' : 'grab';
  });
  cv.addEventListener('pointerup', function (e) {
    var wasDrag = drag && drag.moved > 6;
    drag = null;
    if (wasDrag) return;
    var r = cv.getBoundingClientRect();
    var f = pick(e.clientX - r.left, e.clientY - r.top);
    if (f) select(f); else deselect();
  });
  cv.addEventListener('pointerleave', function () { state.hover = null; hideTip(); draw(); });

  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var k = Math.exp(-e.deltaY * 0.0012);
    if (proj.flat) { proj.flatZoom = Math.max(0.6, Math.min(9, proj.flatZoom * k)); }
    else { proj.scale = Math.max(Math.min(W, H) * 0.25, Math.min(Math.min(W, H) * 3.2, proj.scale * k)); proj._userScale = true; }
    draw();
  }, { passive: false });

  // pinch zoom (basic)
  var pts = {};
  cv.addEventListener('pointerdown', function (e) { pts[e.pointerId] = e; });
  cv.addEventListener('pointerup', function (e) { delete pts[e.pointerId]; });
  cv.addEventListener('pointermove', function (e) {
    if (pts[e.pointerId]) pts[e.pointerId] = e;
    var ids = Object.keys(pts); if (ids.length !== 2) return;
    var a = pts[ids[0]], b = pts[ids[1]];
    var dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (cv._pd) {
      var k = dist / cv._pd;
      if (proj.flat) proj.flatZoom = Math.max(0.6, Math.min(9, proj.flatZoom * k));
      else { proj.scale = Math.max(Math.min(W, H) * 0.25, Math.min(Math.min(W, H) * 3.2, proj.scale * k)); proj._userScale = true; }
      draw();
    }
    cv._pd = dist;
  });
  cv.addEventListener('pointerup', function () { cv._pd = null; });

  // ---- tooltip ----
  var tip = document.getElementById('tip');
  function showTip(x, y, f) {
    tip.innerHTML = '<b>' + f.name + '</b><span class="t-sc">' + f.data.score + '</span>';
    tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.remove('hidden');
  }
  function hideTip() { tip.classList.add('hidden'); }

  // ---- fly to ----
  function flyTo(f) {
    if (anim) cancelAnimationFrame(anim.raf);
    var t0 = performance.now(), dur = 650;
    if (proj.flat) {
      var s = proj.scale * proj.flatZoom;
      var tx = -(f.centroid[0] * D2R + proj.lambda0) * s / Math.PI;
      var ty = (f.centroid[1] * D2R) * s / Math.PI;
      var sx = proj.flatX, sy = proj.flatY;
      step(function (e) { proj.flatX = lerp(sx, tx, e); proj.flatY = lerp(sy, ty, e); });
    } else {
      var sl = proj.lambda0, sp = proj.phi0;
      var tl = -f.centroid[0] * D2R, tp = f.centroid[1] * D2R;
      while (tl - sl > Math.PI) tl -= 2 * Math.PI; while (sl - tl > Math.PI) tl += 2 * Math.PI;
      step(function (e) { proj.lambda0 = lerp(sl, tl, e); proj.phi0 = lerp(sp, tp, e); });
    }
    function step(apply) {
      function frame(now) {
        var t = Math.min(1, (now - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        apply(e); draw();
        if (t < 1) anim = { raf: requestAnimationFrame(frame) }; else anim = null;
      }
      anim = { raf: requestAnimationFrame(frame) };
    }
  }

  // ---- selection / detail panel ----
  var detail = document.getElementById('detail'), dbody = document.getElementById('detail-body');
  function select(f) {
    state.selected = f; state.hover = null; hideTip();
    renderDetail(f); detail.classList.remove('hidden'); flyTo(f); draw();
  }
  function deselect() { state.selected = null; detail.classList.add('hidden'); draw(); }
  document.getElementById('closeDetail').onclick = deselect;

  function renderDetail(f) {
    var d = f.data, tierC = QCOLOR[d.q] || '#888';
    var densTxt = d.q === 'IfSAR' ? '~5 m radar' : d.q === 'none' ? 'no lidar' : d.dens + ' pts/m²';
    var tierLabel = { QL0: 'QL0 · ultra', QL1: 'QL1 · high', QL2: 'QL2 · standard', QL3: 'QL3 · legacy',
                      IfSAR: 'IfSAR · radar', none: 'none' }[d.q] || d.q;
    dbody.innerHTML =
      '<div class="d-name">' + f.name + '</div>' +
      '<div class="d-ctry">' + (CTRY[f.country] || f.country) + '</div>' +
      '<div class="gauge"><i style="width:' + d.score + '%;background:' + rampColor(d.score / 100) + '"></i></div>' +
      '<div style="font-size:11px;color:var(--dim)">Detail index ' + d.score + ' / 100</div>' +
      '<div class="d-stats">' +
        '<div class="stat"><b>' + d.cov + '%</b><span>QL2+ coverage</span></div>' +
        '<div class="stat"><b style="color:' + tierC + '">' + d.q + '</b><span>' + densTxt + '</span></div>' +
      '</div>' +
      '<div class="d-row"><span>Quality tier</span><b><span class="tier-badge" style="background:' + tierC + '">' + tierLabel + '</span></b></div>' +
      '<div class="d-row"><span>Program</span><b>' + d.prog + '</b></div>' +
      '<div class="d-row"><span>Latest collection</span><b>' + d.yr + '</b></div>' +
      (d.gap ? '<div class="d-gap"><b>Missing / caveats</b>' + d.gap + '</div>' : '') +
      (d.portal ? '<a class="d-link" href="' + d.portal + '" target="_blank" rel="noopener">Open data portal →</a>' : '');
  }

  // ---- legend ----
  function renderLegend() {
    var el = document.getElementById('legend'), sub = document.getElementById('legend-sub');
    var html = '';
    if (state.mode === 'tier' && !state.gapsOnly) {
      sub.textContent = 'point density';
      var tiers = [['QL0', '≥8 pts/m² · 5 cm'], ['QL1', '≥8 pts/m² · 10 cm'], ['QL2', '≥2 pts/m² (standard)'],
                   ['QL3', '≥0.5 pts/m² legacy'], ['IfSAR', '~5 m radar'], ['none', 'no lidar']];
      tiers.forEach(function (t) {
        html += '<div class="lg"><span class="sw" style="background:' + QCOLOR[t[0]] + '"></span>' + t[0] + '<small>' + t[1] + '</small></div>';
      });
    } else {
      sub.textContent = state.gapsOnly ? 'gaps' : (state.mode === 'cov' ? '% area' : 'index 0–100');
      var stops = [[100, 'Complete / best'], [75, 'Strong'], [50, 'Partial'], [25, 'Sparse'], [0, 'None / radar']];
      stops.forEach(function (s) {
        html += '<div class="lg"><span class="sw" style="background:' + rampColor(s[0] / 100) + '"></span>' + s[1] + '<small>' + s[0] + '</small></div>';
      });
    }
    el.innerHTML = html;
  }

  // ---- search ----
  var search = document.getElementById('search'), suggest = document.getElementById('suggest'), selIdx = -1;
  function runSearch() {
    var q = search.value.trim().toLowerCase();
    if (!q) { suggest.classList.remove('on'); return; }
    var hits = feats.filter(function (f) {
      return f.name.toLowerCase().indexOf(q) >= 0 || (CTRY[f.country] || '').toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return b.data.score - a.data.score; }).slice(0, 8);
    if (!hits.length) { suggest.classList.remove('on'); return; }
    selIdx = -1;
    suggest.innerHTML = hits.map(function (f, i) {
      return '<div data-id="' + f.id + '"><span>' + f.name + ' <span style="color:var(--dim);font-size:11px">' +
        (CTRY[f.country] || '') + '</span></span><span class="r-sc">' + f.data.score + '</span></div>';
    }).join('');
    suggest.classList.add('on');
    Array.prototype.forEach.call(suggest.children, function (row) {
      row.onclick = function () { pickById(row.getAttribute('data-id')); };
    });
  }
  function pickById(id) {
    var f = feats.filter(function (x) { return x.id === id; })[0];
    if (f) { select(f); search.value = f.name; suggest.classList.remove('on'); }
  }
  search.addEventListener('input', runSearch);
  search.addEventListener('keydown', function (e) {
    var rows = suggest.children; if (!suggest.classList.contains('on')) return;
    if (e.key === 'ArrowDown') { selIdx = Math.min(rows.length - 1, selIdx + 1); }
    else if (e.key === 'ArrowUp') { selIdx = Math.max(0, selIdx - 1); }
    else if (e.key === 'Enter') { if (rows[selIdx]) pickById(rows[selIdx].getAttribute('data-id')); else if (rows[0]) pickById(rows[0].getAttribute('data-id')); return; }
    else return;
    e.preventDefault();
    Array.prototype.forEach.call(rows, function (r, i) { r.classList.toggle('sel', i === selIdx); });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search')) suggest.classList.remove('on'); });

  // ---- controls ----
  document.getElementById('mode').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    Array.prototype.forEach.call(this.children, function (c) { c.classList.remove('on'); });
    b.classList.add('on'); state.mode = b.getAttribute('data-mode'); renderLegend(); draw();
  });
  document.getElementById('spin').onchange = function () { state.spin = this.checked; if (state.spin) spinLoop(); };
  document.getElementById('grat').onchange = function () { state.grat = this.checked; draw(); };
  document.getElementById('gapsOnly').onchange = function () { state.gapsOnly = this.checked; renderLegend(); draw(); };
  document.getElementById('flat').onchange = function () {
    proj.flat = this.checked; proj._userScale = false;
    proj.flatZoom = 1; proj.flatX = 0; proj.flatY = 0; resize();
  };
  document.getElementById('reset').onclick = function () {
    proj.lambda0 = 100 * D2R; proj.phi0 = 45 * D2R; proj._userScale = false;
    proj.flatZoom = 1; proj.flatX = 0; proj.flatY = 0; deselect(); resize();
  };
  function spinLoop() {
    if (!state.spin) return;
    proj.lambda0 -= 0.0016; draw();
    requestAnimationFrame(spinLoop);
  }

  // zoom buttons
  var zoom = document.createElement('div'); zoom.id = 'zoom';
  zoom.innerHTML = '<button id="zin">+</button><button id="zout">−</button>';
  document.getElementById('app').appendChild(zoom);
  function zBy(k) {
    if (proj.flat) proj.flatZoom = Math.max(0.6, Math.min(9, proj.flatZoom * k));
    else { proj.scale = Math.max(Math.min(W, H) * 0.25, Math.min(Math.min(W, H) * 3.2, proj.scale * k)); proj._userScale = true; }
    draw();
  }
  document.getElementById('zin').onclick = function () { zBy(1.3); };
  document.getElementById('zout').onclick = function () { zBy(1 / 1.3); };

  // compass
  var comp = document.createElement('div'); comp.className = 'compass';
  comp.innerHTML = 'drag to orbit · scroll to zoom · click a region';
  document.getElementById('app').appendChild(comp);

  // ---- gaps + sources ----
  document.getElementById('gaps').innerHTML = GAPS.map(function (g) { return '<li>' + g + '</li>'; }).join('');
  var modal = document.getElementById('modal');
  document.getElementById('srcBtn').onclick = function () {
    document.getElementById('modal-body').innerHTML =
      '<p class="meth">Coverage and quality are compiled from public national & sub-national elevation ' +
      'programs. The <b>detail index</b> (0–100) combines percent area meeting the USGS QL2 standard ' +
      'with a weight for the best quality tier available (QL0 highest → IfSAR/none lowest). Figures are ' +
      'approximate and reflect data available or in progress as of mid-2026.</p>' +
      SOURCES.map(function (s) {
        return '<div class="src"><b>' + s.name + '</b><span class="reg">' + s.region + '</span>' +
          '<p>' + s.note + '</p><a href="' + s.url + '" target="_blank" rel="noopener">' + s.url + '</a></div>';
      }).join('');
    modal.classList.remove('hidden');
  };
  document.getElementById('closeModal').onclick = function () { modal.classList.add('hidden'); };
  modal.onclick = function (e) { if (e.target === modal) modal.classList.add('hidden'); };

  // ---- go ----
  renderLegend(); resize();
})();
