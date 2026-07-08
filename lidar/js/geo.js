// Projection + geometry helpers (no external deps).
// Orthographic ("globe") and equirectangular ("flat") projections,
// inverse mapping for hit-testing, and point-in-polygon.
(function (global) {
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;

  function Projection() {
    this.scale = 300;          // globe radius in px
    this.cx = 0; this.cy = 0;  // screen center
    this.lambda0 = 100 * D2R;  // rotation: center longitude (west-positive handled below)
    this.phi0 = 45 * D2R;      // rotation: center latitude
    this.flat = false;
    this.flatZoom = 1;
    this.flatX = 0; this.flatY = 0;
  }

  // forward: [lon,lat] -> {x,y,visible}
  Projection.prototype.project = function (lon, lat) {
    if (this.flat) {
      var s = this.scale * this.flatZoom;
      return {
        x: this.cx + (lon * D2R + this.lambda0Flat()) * s / Math.PI + this.flatX,
        y: this.cy - (lat * D2R) * s / Math.PI * 1.0 + this.flatY,
        visible: true
      };
    }
    var l = lon * D2R + this.lambda0;
    var p = lat * D2R;
    var cosc = Math.sin(this.phi0) * Math.sin(p) + Math.cos(this.phi0) * Math.cos(p) * Math.cos(l);
    var x = this.cx + this.scale * Math.cos(p) * Math.sin(l);
    var y = this.cy - this.scale * (Math.cos(this.phi0) * Math.sin(p) - Math.sin(this.phi0) * Math.cos(p) * Math.cos(l));
    return { x: x, y: y, visible: cosc >= 0 };
  };

  Projection.prototype.lambda0Flat = function () { return this.lambda0; };

  // inverse: screen [x,y] -> {lon,lat} or null (miss / off globe)
  Projection.prototype.invert = function (x, y) {
    if (this.flat) {
      var s = this.scale * this.flatZoom;
      var lon = ((x - this.cx - this.flatX) * Math.PI / s - this.lambda0) * R2D;
      var lat = (-(y - this.cy - this.flatY) * Math.PI / s) * R2D;
      if (lat < -90 || lat > 90) return null;
      lon = ((lon + 180) % 360 + 360) % 360 - 180;
      return { lon: lon, lat: lat };
    }
    var dx = (x - this.cx) / this.scale;
    var dy = -(y - this.cy) / this.scale;
    var rho = Math.sqrt(dx * dx + dy * dy);
    if (rho > 1) return null;
    var c = Math.asin(rho);
    var sinc = Math.sin(c), cosc = Math.cos(c);
    var lat = Math.asin(cosc * Math.sin(this.phi0) + (rho ? dy * sinc * Math.cos(this.phi0) / rho : 0));
    var lon = this.lambda0 * -1 + Math.atan2(dx * sinc, rho * Math.cos(this.phi0) * cosc - dy * Math.sin(this.phi0) * sinc);
    return { lon: lon * R2D, lat: lat * R2D };
  };

  // point in polygon (rings in [lon,lat]); handles holes
  function pointInRing(lon, lat, ring) {
    var inside = false, n = ring.length;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) &&
          (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function pointInPolygon(lon, lat, poly) {
    if (!pointInRing(lon, lat, poly[0])) return false;
    for (var h = 1; h < poly.length; h++) if (pointInRing(lon, lat, poly[h])) return false;
    return true;
  }
  function pointInGeom(lon, lat, geom) {
    if (geom.type === 'Polygon') return pointInPolygon(lon, lat, geom.coordinates);
    for (var p = 0; p < geom.coordinates.length; p++)
      if (pointInPolygon(lon, lat, geom.coordinates[p])) return true;
    return false;
  }

  // centroid (area-weighted over the largest ring) + bbox
  function geomMeta(geom) {
    var polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    var best = null, bestA = -1;
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    polys.forEach(function (poly) {
      var ring = poly[0], a = 0, cx = 0, cy = 0;
      for (var i = 0; i < ring.length - 1; i++) {
        var x0 = ring[i][0], y0 = ring[i][1], x1 = ring[i + 1][0], y1 = ring[i + 1][1];
        var f = x0 * y1 - x1 * y0; a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
        if (x0 < minx) minx = x0; if (x0 > maxx) maxx = x0;
        if (y0 < miny) miny = y0; if (y0 > maxy) maxy = y0;
      }
      a *= 0.5;
      if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = a ? [cx / (6 * a), cy / (6 * a)] : ring[0]; }
    });
    return { centroid: best, bbox: [minx, miny, maxx, maxy] };
  }

  global.Geo = {
    Projection: Projection, D2R: D2R, R2D: R2D,
    pointInGeom: pointInGeom, geomMeta: geomMeta
  };
})(window);
