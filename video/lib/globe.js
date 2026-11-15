// Sawti 360 dotted globe: real 3D rotation + perspective, drawn on a 2D canvas.
// Pure function of its state, so every frame renders the same at any seek.
(function () {
  const D2R = Math.PI / 180;
  const INK = "18,48,46";
  const RED = "200,16,46";

  function toVec(lon, lat) {
    const l = lon * D2R, p = lat * D2R;
    return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
  }
  function norm(v) {
    const m = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / m, v[1] / m, v[2] / m];
  }
  function slerp(a, b, t) {
    const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const om = Math.acos(d);
    if (om < 1e-6) return a;
    const s = Math.sin(om);
    const k1 = Math.sin((1 - t) * om) / s, k2 = Math.sin(t * om) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }

  window.SawtiGlobe = function (canvas) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const raw = window.__LAND_DOTS || [];
    const dots = raw.map((d) => toVec(d[0], d[1]));
    const masks = raw.map((d) => d[2] || 0);
    const dist = raw.map((d) => (d[3] == null ? 1 : d[3]));

    function rotator(lon0, lat0) {
      const cl = Math.cos(-lon0 * D2R), sl = Math.sin(-lon0 * D2R);
      const cp = Math.cos(lat0 * D2R), sp = Math.sin(lat0 * D2R);
      return function (v) {
        // yaw around Y, then pitch around X
        const x1 = v[0] * cl + v[2] * sl, z1 = -v[0] * sl + v[2] * cl, y1 = v[1];
        const y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp;
        return [x1, y2, z2];
      };
    }

    return function render(s) {
      // s: { lon0, lat0, R, cx, cy, alpha, arcs:[{from:[lon,lat], to:[lon,lat], p, stop, fade, label}], pulses:[{at:[lon,lat], t}] }
      const R = s.R, cx = s.cx, cy = s.cy, A = s.alpha == null ? 1 : s.alpha;
      const rot = rotator(s.lon0, s.lat0);
      const Dp = 4.2; // perspective distance in radii
      const proj = (v) => {
        const r = rot(v);
        const f = Dp / (Dp - r[2]);
        return [cx + r[0] * R * f, cy - r[1] * R * f, r[2], f];
      };
      ctx.clearRect(0, 0, W, H);
      if (A <= 0.001) return;
      ctx.save();
      ctx.globalAlpha = A;

      // sphere body with soft key light from upper left
      const Re = (R * Dp) / Math.sqrt(Dp * Dp - 1);
      const g = ctx.createRadialGradient(cx - Re * 0.35, cy - Re * 0.4, Re * 0.1, cx, cy, Re);
      g.addColorStop(0, "rgba(244,238,224,1)");
      g.addColorStop(0.75, "rgba(226,216,192,1)");
      g.addColorStop(1, "rgba(206,194,166,1)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, Re, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(" + INK + ",0.35)";
      ctx.stroke();

      // graticule (faint)
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(" + INK + ",0.08)";
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let pen = false;
        for (let lon = -180; lon <= 180; lon += 4) {
          const q = proj(toVec(lon, lat));
          if (q[2] < 1 / Dp) { pen = false; continue; }
          pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
          pen = true;
        }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let pen = false;
        for (let lat = -80; lat <= 80; lat += 4) {
          const q = proj(toVec(lon, lat));
          if (q[2] < 1 / Dp) { pen = false; continue; }
          pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
          pen = true;
        }
        ctx.stroke();
      }

      // land dots, sized and shaded by depth; language layers light them up
      const layers = s.layers || [];
      for (let i = 0; i < dots.length; i++) {
        const q = proj(dots[i]);
        if (q[2] < 1 / Dp + 0.01) continue;
        const z = q[2];
        let col = null, boost = 1;
        for (let L = layers.length - 1; L >= 0; L--) {
          const ly = layers[L];
          if ((masks[i] & ly.mask) && dist[i] <= ly.t) { col = ly.color; boost = ly.size || 1.35; break; }
        }
        if (masks[i] & 1 && s.tunisiaBig) boost = Math.max(boost, 2.4);
        const sz = (1.4 + 2.3 * z) * (R / 480) * boost;
        ctx.fillStyle = col ? "rgba(" + col + "," + (0.55 + 0.45 * z).toFixed(3) + ")" : "rgba(" + INK + "," + ((0.36 + 0.6 * z) * (s.dim == null ? 1 : s.dim)).toFixed(3) + ")";
        ctx.fillRect(q[0] - sz / 2, q[1] - sz / 2, sz, sz);
      }

      // arcs: great circle lifted above the surface
      (s.arcs || []).forEach((a) => {
        if (!(a.p > 0)) return;
        const va = toVec(a.from[0], a.from[1]), vb = toVec(a.to[0], a.to[1]);
        const d = Math.acos(Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
        const lift = a.lift != null ? a.lift : 0.08 + 0.32 * (d / Math.PI);
        const end = Math.min(a.p, a.stop == null ? 1 : a.stop);
        const pts = [];
        const n = 80;
        for (let k = 0; k <= n; k++) {
          const t = (k / n) * end;
          const v = slerp(va, vb, t);
          const h = 1 + lift * Math.sin(Math.PI * t);
          pts.push(proj([v[0] * h, v[1] * h, v[2] * h]));
        }
        const fade = a.fade || 0;
        ctx.lineCap = "round";
        ctx.lineWidth = 5 * (R / 480);
        ctx.setLineDash(fade > 0 ? [10, 12] : []);
        ctx.strokeStyle = "rgba(" + RED + "," + (1 - 0.65 * fade).toFixed(3) + ")";
        ctx.beginPath();
        pts.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.stroke();
        ctx.setLineDash([]);
        const head = pts[pts.length - 1];
        if (a.stop != null && a.p >= a.stop) {
          // the voice hits the language border: a red cross where it stops
          const k = 16 * (R / 480);
          ctx.lineWidth = 6 * (R / 480);
          ctx.strokeStyle = "rgba(" + RED + ",1)";
          ctx.beginPath();
          ctx.moveTo(head[0] - k, head[1] - k); ctx.lineTo(head[0] + k, head[1] + k);
          ctx.moveTo(head[0] + k, head[1] - k); ctx.lineTo(head[0] - k, head[1] + k);
          ctx.stroke();
          if (a.stopLabel) {
            ctx.font = "700 " + Math.round(30 * (R / 600)) + "px Inter, sans-serif";
            ctx.fillStyle = "rgba(" + INK + "," + Math.min(1, a.fade || 0).toFixed(3) + ")";
            ctx.fillText(a.stopLabel, head[0] + 26 * (R / 600), head[1] - 14 * (R / 600));
          }
        } else if (a.p < 1) {
          ctx.fillStyle = "rgba(" + RED + ",1)";
          ctx.beginPath();
          ctx.arc(head[0], head[1], 7 * (R / 480), 0, Math.PI * 2);
          ctx.fill();
        } else if (a.label) {
          const q = proj(vb);
          if (q[2] > 0.1) {
            ctx.fillStyle = "rgba(" + RED + ",1)";
            ctx.beginPath();
            ctx.arc(q[0], q[1], 7 * (R / 480), 0, Math.PI * 2);
            ctx.fill();
            ctx.font = "700 " + Math.round(32 * (R / 480)) + "px Inter, sans-serif";
            ctx.fillStyle = "rgba(" + INK + "," + Math.min(1, (a.p - 1) * 6 + 1).toFixed(3) + ")";
            ctx.fillText(a.label, q[0] + 12 * (R / 480), q[1] - 10 * (R / 480));
          }
        }
      });

      // pulses (expanding rings)
      (s.pulses || []).forEach((pl) => {
        if (pl.t <= 0 || pl.t >= 1) return;
        const q = proj(toVec(pl.at[0], pl.at[1]));
        if (q[2] < 0) return;
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(" + RED + "," + (1 - pl.t).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(q[0], q[1], (8 + 46 * pl.t) * (R / 480), 0, Math.PI * 2);
        ctx.stroke();
      });

      // home dot: Tunis
      if (s.home) {
        const q = proj(toVec(s.home[0], s.home[1]));
        if (q[2] > 0) {
          ctx.fillStyle = "rgba(" + RED + ",1)";
          ctx.beginPath();
          ctx.arc(q[0], q[1], 9 * (R / 480), 0, Math.PI * 2);
          ctx.fill();
          if (s.homeLabel) {
            ctx.font = "700 " + Math.round(28 * (R / 480)) + "px Inter, sans-serif";
            ctx.fillStyle = "rgba(" + INK + ",1)";
            ctx.fillText(s.homeLabel, q[0] + 16 * (R / 480), q[1] + 30 * (R / 480));
          }
        }
      }
      ctx.restore();
    };
  };
})();
