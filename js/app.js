/* 匹克球自創攻略 — 頁面互動：2.5D 等角圖、發球輪替、目錄、篩選、測驗、影片、斗內 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var NS = 'http://www.w3.org/2000/svg';

  /* ============================================================
   * 2.5D 等角投影引擎
   * 球場座標（公尺）：x = 長邊（-6.705 ~ 6.705，網在 0），z = 寬邊（-3.05 ~ 3.05），y = 高度
   * ============================================================ */
  var HL = 6.705, HW = 3.05, KL = 2.134;
  var TH = 0.32, COS = Math.cos(TH), SIN = Math.sin(TH), TILT = 0.5, UP = 0.95;

  function makeProj(vbW, vbH, S, cy) {
    var cx = vbW / 2;
    return function (x, y, z) {
      var X = x * COS + z * SIN;
      var D = -x * SIN + z * COS;
      return [cx + X * S, cy + D * S * TILT - y * S * UP];
    };
  }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function poly(P, pts, style, parent) {
    return el('polygon', { points: pts.map(function (p) { var q = P(p[0], p[2] || 0, p[1]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '), style: style }, parent);
  }
  function quad(P, x1, z1, x2, z2, style, parent) {
    return poly(P, [[x1, z1], [x2, z1], [x2, z2], [x1, z2]], style, parent);
  }
  function line3(P, a, b, style, parent) {
    var p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]);
    return el('line', { x1: p[0].toFixed(1), y1: p[1].toFixed(1), x2: q[0].toFixed(1), y2: q[1].toFixed(1), style: style }, parent);
  }
  function text3(P, x, y, z, str, style, parent, anchor) {
    var p = P(x, y, z);
    var t = el('text', { x: p[0].toFixed(1), y: p[1].toFixed(1), 'text-anchor': anchor || 'middle', style: style }, parent);
    t.textContent = str;
    return t;
  }

  var TEAM = { A: 'var(--team-a)', B: 'var(--team-b)' };
  var LABEL_STYLE = 'font:700 13px var(--f-body);fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:3px';

  function drawCourt(g, P, opts) {
    opts = opts || {};
    // 周圍地面
    quad(P, -HL - 2.2, -HW - 1.6, HL + 2.2, HW + 1.6, 'fill:var(--surface-2)', g);
    // 發球區（藍）與廚房（綠）
    quad(P, -HL, -HW, HL, HW, 'fill:#1d5d9b', g);
    quad(P, -KL, -HW, KL, HW, 'fill:#2b7a58', g);
    if (opts.kitchenLabel !== false) {
      text3(P, -KL / 2, 0, HW - 0.35, '廚房', 'font:900 13px var(--f-body);fill:rgba(255,255,255,.75)', g);
      text3(P, KL / 2, 0, HW - 0.35, '廚房', 'font:900 13px var(--f-body);fill:rgba(255,255,255,.75)', g);
    }
    // 線
    var L = 'stroke:#fff;stroke-width:2;stroke-linecap:round';
    [[-HL, -HW, HL, -HW], [-HL, HW, HL, HW], [-HL, -HW, -HL, HW], [HL, -HW, HL, HW],
     [-KL, -HW, -KL, HW], [KL, -HW, KL, HW], [-HL, 0, -KL, 0], [KL, 0, HL, 0]].forEach(function (s) {
      line3(P, [s[0], 0, s[1]], [s[2], 0, s[3]], L, g);
    });
  }
  function drawNet(g, P) {
    var zl = -HW - 0.3, zr = HW + 0.3;
    poly(P, [[0, zl, 0], [0, zr, 0], [0, zr, 0.914], [0, 0, 0.864], [0, zl, 0.914]], 'fill:rgba(20,30,36,.28);stroke:rgba(20,30,36,.5);stroke-width:1', g);
    line3(P, [0, 0.914, zl], [0, 0.864, 0], 'stroke:#fff;stroke-width:3', g);
    line3(P, [0, 0.864, 0], [0, 0.914, zr], 'stroke:#fff;stroke-width:3', g);
    line3(P, [0, 0, zl], [0, 0.95, zl], 'stroke:#233;stroke-width:4;stroke-linecap:round', g);
    line3(P, [0, 0, zr], [0, 0.95, zr], 'stroke:#233;stroke-width:4;stroke-linecap:round', g);
  }

  /* 2.5D 球員：優先使用由 3D 真人模型渲染的圖（court3d.js 產生），模型還沒載入前用向量人像代替 */
  var LOOKS = {
    A1: { skin: '#e9b995', hair: '#2b1d14', short: '#f2f2f2' },
    A2: { skin: '#e2b08c', hair: '#1a1a1a', short: '#2b2f36' },
    B1: { skin: '#f0c8a6', hair: '#4a2f1c', short: '#c9b489' },
    B2: { skin: '#d9a47f', hair: '#3a2416', short: '#2f4f7a' }
  };
  var SPRITES = null; // { A1: { ready, swing, move, x, y, w, h }, ... }
  function drawHuman(parent, def) {
    var lk = LOOKS[def.id] || LOOKS.A1, team = TEAM[def.team];
    var g = el('g', {}, parent);
    function limb(d, color, w, extra, p) { return el('path', { d: d, style: 'fill:none;stroke:' + color + ';stroke-width:' + w + ';stroke-linecap:round;stroke-linejoin:round;' + (extra || '') }, p || g); }
    var dark = 'filter:brightness(.86)';
    limb('M-2 -50 L-7 -28 L-4 -6', lk.skin, 7, dark);
    el('path', { d: 'M-10 -6 h13 a3 3 0 0 1 3 3 v1 a2 2 0 0 1 -2 2 h-15 a2 2 0 0 1 -2 -2 v-1 a3 3 0 0 1 3 -3z', style: 'fill:#e8ecef;stroke:#9aa5ad;stroke-width:1' }, g);
    limb('M0 -78 L7 -64 L15 -66', lk.skin, 5.5, dark);
    el('path', { d: 'M-10 -59 L10 -59 L13 -41 L3 -40 L1 -47 L-2 -40 L-12 -41 Z', style: 'fill:' + lk.short }, g);
    limb('M3 -50 L10 -28 L10 -6', lk.skin, 7);
    el('path', { d: 'M5 -6 h12 a4 4 0 0 1 4 4 v0 a2 2 0 0 1 -2 2 h-15 a2 2 0 0 1 -2 -2 v-1 a3 3 0 0 1 3 -3z', style: 'fill:#ffffff;stroke:#9aa5ad;stroke-width:1' }, g);
    el('path', { d: 'M-10 -58 L11 -58 L13 -79 Q4 -85 -6 -82 Z', style: 'fill:' + team + ';stroke:rgba(0,0,0,.2);stroke-width:1' }, g);
    el('rect', { x: 1, y: -86, width: 6, height: 6, rx: 2, style: 'fill:' + lk.skin }, g);
    el('circle', { cx: 5, cy: -92, r: 7.5, style: 'fill:' + lk.skin }, g);
    el('path', { d: 'M-2.6 -92 A7.6 7.6 0 0 1 12 -95 Q7 -97 3 -93 Q1 -90 -1 -88 Z', style: 'fill:' + lk.hair }, g);
    // 準備姿勢的手與揮拍的手（依狀態切換）
    var ready = el('g', {}, g), swing = el('g', { visibility: 'hidden' }, g);
    limb('M5 -77 L14 -66 L22 -71', lk.skin, 5.5, '', ready);
    el('path', { d: 'M22 -71 L24 -77', style: 'stroke:#15191c;stroke-width:3;stroke-linecap:round' }, ready);
    el('ellipse', { cx: 26, cy: -86, rx: 6, ry: 9, style: 'fill:#20262b;stroke:var(--ball);stroke-width:1.6' }, ready);
    limb('M5 -77 L18 -74 L30 -70', lk.skin, 5.5, '', swing);
    el('path', { d: 'M30 -70 L36 -69', style: 'stroke:#15191c;stroke-width:3;stroke-linecap:round' }, swing);
    el('ellipse', { cx: 44, cy: -69, rx: 9, ry: 6, style: 'fill:#20262b;stroke:var(--ball);stroke-width:1.6' }, swing);
    return { g: g, setState: function (s) { var sw = s === 'swing'; ready.setAttribute('visibility', sw ? 'hidden' : 'visible'); swing.setAttribute('visibility', sw ? 'visible' : 'hidden'); } };
  }
  function Player(g, P, def) {
    var grp = el('g', {}, g);
    var shadow = el('ellipse', { rx: 15, ry: 5, style: 'fill:rgba(0,0,0,.28)' }, grp);
    var ring = el('ellipse', { rx: 20, ry: 8, style: 'fill:none;stroke:' + TEAM[def.team] + ';stroke-width:2.5;opacity:.9' }, grp);
    var fig = el('g', {}, grp), img = null, vec = null, state = '';
    var sp = SPRITES && SPRITES[def.id];
    if (sp) img = el('image', { href: sp.ready, x: sp.x, y: sp.y, width: sp.w, height: sp.h }, fig);
    else vec = drawHuman(fig, def);
    var tagBg = el('rect', { rx: 7, height: 15, style: 'fill:' + TEAM[def.team] }, grp);
    var label = el('text', { 'text-anchor': 'middle', style: 'font:800 11px var(--f-body);fill:#fff' }, grp);
    label.textContent = def.label || def.id;
    if (def.hl) ring.setAttribute('style', 'fill:none;stroke:var(--ball);stroke-width:3.5');
    var api = {
      def: def, x: def.x, z: def.z,
      set: function (x, z, st) {
        api.x = x; api.z = z;
        var f = P(x, 0, z), h = P(x, 1.7, z), ht = f[1] - h[1], k = ht / 100;
        shadow.setAttribute('cx', f[0]); shadow.setAttribute('cy', f[1]);
        ring.setAttribute('cx', f[0]); ring.setAttribute('cy', f[1]);
        var flip = vec && def.team === 'B' ? -1 : 1;
        fig.setAttribute('transform', 'translate(' + f[0].toFixed(1) + ',' + f[1].toFixed(1) + ') scale(' + (flip * k).toFixed(3) + ',' + k.toFixed(3) + ')');
        var tw = Math.max(26, label.textContent.length * 8 + 10), top = f[1] - ht * 1.08;
        tagBg.setAttribute('x', f[0] - tw / 2); tagBg.setAttribute('y', top - 18); tagBg.setAttribute('width', tw);
        label.setAttribute('x', f[0]); label.setAttribute('y', top - 6.5);
        st = st || 'ready';
        if (st !== state) {
          state = st;
          if (img) img.setAttribute('href', sp[st] || sp.ready);
          if (vec) vec.setState(st);
        }
      }
    };
    api.set(def.x, def.z, 'ready');
    return api;
  }

  function ballAt(seg, t) {
    var a = seg.a, b = seg.b;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * seg.arc * t * (1 - t), a[2] + (b[2] - a[2]) * t];
  }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* 劇本編譯：和 3D 實驗室同一套規則。每一拍從擊球者的拍子出發，彈地後飛到下一位擊球者的拍子 */
  function contact(id, xz) { var d = id[0] === 'A' ? 1 : -1; return [xz[0] + d * 0.35, 0.85, xz[1] + d * 0.3]; }
  function compile(scene) {
    var pos = {}, t = 0, steps = [], segs = [];
    for (var id in scene.setup) pos[id] = scene.setup[id].slice();
    (scene.steps || []).forEach(function (st) {
      var s = { src: st, t0: t, dur: st.dur, start: {}, end: {} };
      for (var k in pos) s.start[k] = pos[k].slice();
      for (var m in (st.moves || {})) pos[m] = st.moves[m].slice();
      for (var k2 in pos) s.end[k2] = pos[k2].slice();
      steps.push(s); t += st.dur;
    });
    function arc(a, b, h) { return Math.max(0.05, h - (a[1] + b[1]) / 2); }
    steps.forEach(function (s, i) {
      var st = s.src; if (!st.hitter) return;
      var A = contact(st.hitter, s.start[st.hitter]);
      var nx = steps[i + 1] && steps[i + 1].src.hitter;
      var C = nx ? contact(nx, s.end[nx]) : (st.to || null);
      var style = { color: st.color, dash: st.dash, step: i, tagT: st.tagT };
      if (st.land) {
        var Bp = [st.land[0], 0.03, st.land[1]];
        if (!C) { var dx = Bp[0] - A[0], dz = Bp[2] - A[2], L = Math.hypot(dx, dz) || 1; C = [Bp[0] + dx / L * 1.3, 0.03, Bp[2] + dz / L * 1.3]; }
        var d1 = Math.hypot(Bp[0] - A[0], Bp[2] - A[2]), d2 = Math.hypot(C[0] - Bp[0], C[2] - Bp[2]);
        var r = Math.min(0.85, Math.max(0.55, d1 / (d1 + d2 * 0.9)));
        segs.push(Object.assign({ a: A, b: Bp, arc: arc(A, Bp, st.h), t0: s.t0, t1: s.t0 + s.dur * r, bounce: true, tag: st.tag }, style));
        segs.push(Object.assign({ a: Bp, b: C, arc: nx ? 0.28 + Math.max(0, C[1] - 0.5) * 0.3 : 0.12, t0: s.t0 + s.dur * r, t1: s.t0 + s.dur, faint: !nx }, style));
      } else if (C) {
        segs.push(Object.assign({ a: A, b: C, arc: arc(A, C, st.h), t0: s.t0, t1: s.t0 + s.dur, tag: st.tag }, style));
      }
    });
    return { steps: steps, segs: segs, total: t };
  }

  /* 產生 2.5D 圖：scene = { S, cy, setup:{id:[x,z]}, steps:[...], zones, labels, rope, caption, hl } */
  function renderIso(svg, scene) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var vb = (svg.getAttribute('viewBox') || '0 0 800 400').split(' ').map(Number);
    var P = makeProj(vb[2], vb[3], scene.S || 48, scene.cy || vb[3] * 0.56);
    var g = el('g', {}, svg);
    drawCourt(g, P, scene);
    (scene.zones || []).forEach(function (zn) {
      quad(P, zn.x1, zn.z1, zn.x2, zn.z2, 'fill:' + zn.color + ';opacity:.55', g);
      if (zn.label) text3(P, zn.lx != null ? zn.lx : (zn.x1 + zn.x2) / 2, 0, zn.front ? zn.z2 + 0.75 : zn.z1 - 0.55, zn.label, 'font:800 13px var(--f-body);fill:var(--ink)', g);
    });
    var C = compile(scene), segs = C.segs, steps = C.steps;
    // 路線只在那一拍進行時出現：球路跟著球一路畫出來，這一拍結束後淡出
    var trails = el('g', {}, g), moveEls = [], segEls = [];
    steps.forEach(function (s) {
      for (var id in (s.src.moves || {})) {
        var a = s.start[id], b = s.end[id];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.3) continue;
        var ln = line3(P, [a[0], 0.02, a[1]], [a[0], 0.02, a[1]], 'stroke:var(--ink);stroke-width:1.6;stroke-dasharray:3 4', trails);
        var dot = el('circle', { r: 2.6, style: 'fill:var(--ink)' }, trails);
        moveEls.push({ s: s, a: a, b: b, ln: ln, dot: dot });
      }
    });
    function segPoints(sg, upto) {
      var n = Math.max(2, Math.round(28 * upto)), pts = [];
      for (var i = 0; i <= n; i++) { var p = ballAt(sg, upto * i / n), q = P(p[0], p[1], p[2]); pts.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
      return pts.join(' ');
    }
    segs.forEach(function (sg) {
      var o = { sg: sg, end: steps[sg.step].t0 + steps[sg.step].dur, op: sg.faint ? 0.45 : 0.9 };
      o.line = el('polyline', { points: '', style: 'fill:none;stroke:' + (sg.color || 'var(--ball)') + ';stroke-width:' + (sg.faint ? 1.6 : 2.5) + ';stroke-dasharray:' + (sg.dash || '6 5') }, trails);
      if (sg.bounce) { var bp = P(sg.b[0], 0, sg.b[2]); o.ring = el('ellipse', { cx: bp[0], cy: bp[1], rx: 9, ry: 4, style: 'fill:none;stroke:' + (sg.color || 'var(--ball)') + ';stroke-width:2' }, trails); }
      if (sg.tag) { var m = sg.bounce && !sg.tagT ? [sg.b[0], 0.1, sg.b[2]] : ballAt(sg, sg.tagT || 0.5); o.tag = text3(P, m[0], m[1] + 0.3, m[2], sg.tag, 'font:800 13px var(--f-body);fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:4px', trails); }
      segEls.push(o);
    });
    function vis(elm, op) { if (!elm) return; elm.style.opacity = op; elm.style.visibility = op > 0 ? 'visible' : 'hidden'; }
    function drawTrails(T, all) {
      segEls.forEach(function (o) {
        var sg = o.sg, op = 0, upto = 1;
        if (all) op = o.op;
        else if (T >= sg.t0 && T <= o.end + 0.5) {
          upto = Math.min(1, (T - sg.t0) / (sg.t1 - sg.t0));
          op = T > o.end ? o.op * (1 - (T - o.end) / 0.5) : o.op;
        }
        if (op > 0) o.line.setAttribute('points', segPoints(sg, upto));
        vis(o.line, op);
        vis(o.ring, all || T >= sg.t1 ? op : 0);
        vis(o.tag, op);
      });
      moveEls.forEach(function (o) {
        var s = o.s, end = s.t0 + s.dur, op = 0, k = 1;
        if (all) op = 0.5;
        else if (T >= s.t0 && T <= end + 0.4) { k = ease(Math.min(1, (T - s.t0) / s.dur)); op = T > end ? 0.5 * (1 - (T - end) / 0.4) : 0.5; }
        var e = P(o.a[0] + (o.b[0] - o.a[0]) * k, 0.02, o.a[1] + (o.b[1] - o.a[1]) * k);
        o.ln.setAttribute('x2', e[0].toFixed(1)); o.ln.setAttribute('y2', e[1].toFixed(1));
        o.dot.setAttribute('cx', e[0].toFixed(1)); o.dot.setAttribute('cy', e[1].toFixed(1));
        vis(o.ln, op); vis(o.dot, op);
      });
    }
    (scene.labels || []).forEach(function (l) { text3(P, l.x, l.y || 0, l.z, l.text, l.style || LABEL_STYLE, g, l.anchor); });
    var rope = scene.rope ? el('line', { style: 'stroke:var(--ball);stroke-width:3;stroke-dasharray:2 5;stroke-linecap:round' }, g) : null;
    var players = {}, ids = Object.keys(scene.setup || {});
    function add(id) { var p = scene.setup[id]; players[id] = Player(g, P, { id: id, team: id[0], x: p[0], z: p[1], label: NAMES[id], hl: scene.hl === id }); }
    ids.filter(function (id) { return id[0] === 'B'; }).forEach(add);
    drawNet(g, P);
    ids.filter(function (id) { return id[0] === 'A'; }).forEach(add);
    var ballShadow = el('ellipse', { rx: 5, ry: 2.2, style: 'fill:rgba(0,0,0,.35)', visibility: 'hidden' }, g);
    var ball = el('circle', { r: 5.5, style: 'fill:var(--ball);stroke:#5a6b12;stroke-width:1', visibility: 'hidden' }, g);
    var capEl = scene.caption ? el('text', { x: 16, y: vb[3] - 14, style: 'font:800 15px var(--f-body);fill:var(--ink)' }, svg) : null;

    function frame(T) {
      if (!steps.length) return;
      var i = 0; while (i < steps.length - 1 && T >= steps[i + 1].t0) i++;
      var s = steps[i], u = Math.max(0, Math.min(1, (T - s.t0) / s.dur)), e = ease(u);
      var swinging = {};
      steps.forEach(function (q) { if (q.src.hitter && T >= q.t0 - 0.12 && T <= q.t0 + 0.3) swinging[q.src.hitter] = 1; });
      for (var id in players) {
        var a = s.start[id], b = s.end[id];
        var moving = (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.3) && u > 0.05 && u < 0.95;
        players[id].set(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, swinging[id] ? 'swing' : moving ? 'move' : 'ready');
      }
      var seg = null, last = null;
      segs.forEach(function (sg) { if (T >= sg.t0 && T <= sg.t1) seg = sg; if (sg.t1 <= T) last = sg; });
      var bp = null;
      if (seg) bp = ballAt(seg, (T - seg.t0) / (seg.t1 - seg.t0));
      else if (last && T - last.t1 < 0.4) bp = last.b;
      if (bp) {
        var q = P(bp[0], Math.max(0.04, bp[1]), bp[2]), sh = P(bp[0], 0, bp[2]);
        ball.setAttribute('cx', q[0]); ball.setAttribute('cy', q[1]); ball.setAttribute('visibility', 'visible');
        ballShadow.setAttribute('cx', sh[0]); ballShadow.setAttribute('cy', sh[1]); ballShadow.setAttribute('visibility', 'visible');
      } else { ball.setAttribute('visibility', 'hidden'); ballShadow.setAttribute('visibility', 'hidden'); }
      if (capEl) capEl.textContent = s.src.cap || '';
      drawTrails(T, reduceMotion);
      if (rope) {
        var ra = players[scene.rope[0]], rb = players[scene.rope[1]];
        var p1 = P(ra.x, 0.05, ra.z), p2 = P(rb.x, 0.05, rb.z);
        rope.setAttribute('x1', p1[0]); rope.setAttribute('y1', p1[1]); rope.setAttribute('x2', p2[0]); rope.setAttribute('y2', p2[1]);
      }
    }
    var ctl = { svg: svg, total: C.total, frame: frame, t0: null, running: false, P: P, g: g, vb: vb, S: scene.S || 48, cy: scene.cy || vb[3] * 0.56 };
    frame(reduceMotion ? C.total : 0);
    if (reduceMotion && capEl) capEl.textContent = '';
    return ctl;
  }

  /* ---------- 圖解場景（格式與 3D 實驗室相同） ---------- */
  var NAMES = { A1: '藍 1', A2: '藍 2', B1: '橘 1', B2: '橘 2' };
  var KP = { A1: [-2.45, 1.5], A2: [-2.45, -1.5], B1: [2.45, -1.5], B2: [2.45, 1.5] };
  var DROP = '#ffd23f', DRIVE = '#ff7a3d', LOB = '#6ab7ff';
  var SCENES = {
    hero: {
      S: 44, cy: 205, caption: true, hl: 'A1',
      setup: { A1: [-7.0, 1.5], A2: [-6.4, -1.5], B1: [7.0, -1.5], B2: [2.5, 1.5] },
      steps: [
        { hitter: 'A1', land: [5.0, -1.5], h: 2.1, dur: 1.8, tag: '① 發球', cap: '① 發球：對角、越過廚房' },
        { hitter: 'B1', land: [-5.5, 0.7], h: 2.5, dur: 1.9, tag: '② 回發球', cap: '② 等球彈地後回深，然後衝上網', moves: { B1: [2.5, -1.5] } },
        { hitter: 'A1', land: [1.2, -0.8], h: 1.9, dur: 1.9, tag: '③', cap: '③ 發球方也要等球彈地（雙跳規則）', moves: { A1: [-4.2, 1.3], A2: [-4.2, -1.4] } },
        { hitter: null, dur: 1.3, cap: '兩次彈地之後，雙方才可以截擊' }
      ]
    },
    dims: {
      S: 48, cy: 225, setup: {}, steps: [],
      labels: [
        { x: -4.4, z: HW + 1.05, text: '長 13.41 m', style: 'font:800 14px var(--f-display);fill:var(--ink);letter-spacing:.06em' },
        { x: -HL - 0.9, z: -1.2, text: '寬 6.10 m', style: 'font:800 14px var(--f-display);fill:var(--ink);letter-spacing:.06em' },
        { x: -KL / 2, z: HW + 0.8, text: '廚房 2.13 m', style: 'font:800 13px var(--f-body);fill:var(--kitchen)' },
        { x: KL / 2 + 0.3, z: HW + 0.8, text: '廚房 2.13 m', style: 'font:800 13px var(--f-body);fill:var(--kitchen)' },
        { x: 0.6, y: 1.7, z: -1.2, text: '網高 中央 86.4 cm／邊 91.4 cm', style: 'font:700 12px var(--f-body);fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:3px' },
        { x: -4.4, z: 1.5, text: '右發球區', style: 'font:700 12px var(--f-body);fill:rgba(255,255,255,.85)' },
        { x: -4.4, z: -1.5, text: '左發球區', style: 'font:700 12px var(--f-body);fill:rgba(255,255,255,.85)' },
        { x: 4.4, z: -1.5, text: '右發球區', style: 'font:700 12px var(--f-body);fill:rgba(255,255,255,.85)' },
        { x: 4.4, z: 1.5, text: '左發球區', style: 'font:700 12px var(--f-body);fill:rgba(255,255,255,.85)' }
      ]
    },
    sequence: {
      S: 46, cy: 220, caption: true,
      setup: { A1: [-7.0, 1.5], A2: [-6.4, -1.5], B1: [7.0, -1.5], B2: [2.5, 1.5] },
      steps: [
        { hitter: 'A1', land: [5.0, -1.5], h: 2.1, dur: 1.8, tag: '1', cap: '第 1 拍：發球，深而穩' },
        { hitter: 'B1', land: [-5.6, 0.9], h: 2.5, dur: 1.9, tag: '2', cap: '第 2 拍：回深，接發方衝上網', moves: { B1: [2.5, -1.5], A1: [-6.9, 1.2] } },
        { hitter: 'A1', land: [1.1, -1.1], h: 1.9, dur: 1.9, tag: '3', color: DROP, cap: '第 3 拍：放短進廚房，發球方往前', moves: { A1: [-4.2, 1.3], A2: [-4.2, -1.4], B1: [1.8, -1.2] } },
        { hitter: 'B1', land: [-3.6, -1.3], h: 1.25, dur: 1.6, tag: '4', cap: '第 4 拍：丁克到對手腳下', moves: { B1: [2.5, -1.5], A2: [-3.9, -1.4] } },
        { hitter: 'A2', land: [1.3, 1.2], h: 1.2, dur: 1.6, tag: '5', cap: '第 5 拍：重置，兩人一起上到廚房線', moves: { A1: [-2.5, 1.5], A2: [-2.5, -1.5], B2: [2.1, 1.3] } },
        { hitter: null, dur: 1.3, cap: '四個人都在網前，丁克戰開始' }
      ]
    },
    third: {
      S: 46, cy: 220, caption: true, hl: 'A1',
      setup: { A1: [-6.8, 1.0], A2: [-6.3, -1.5], B1: KP.B1, B2: KP.B2 },
      steps: [
        { hitter: 'A1', land: [1.2, 0.6], h: 1.95, dur: 1.9, color: DROP, tag: '放短 Drop', cap: '放短：最高點在自己這側，過網後往下掉' },
        { hitter: null, dur: 0.6, cap: '' },
        { hitter: 'A1', land: null, h: 1.05, dur: 0.9, color: DRIVE, dash: '10 4', tag: '抽球 Drive', cap: '抽球：低、平、快，打對手身體', to: [2.1, 1.0, 1.25] },
        { hitter: null, dur: 0.6, cap: '' },
        { hitter: 'A1', land: [5.9, -1.8], h: 5.0, dur: 2.4, color: LOB, tag: '挑高 Lob', cap: '挑高：越過網前對手，落在反手側底線' },
        { hitter: null, dur: 1.0, cap: '' }
      ]
    },
    dinks: {
      S: 50, cy: 215, caption: true,
      zones: [
        { x1: 0.1, x2: 0.75, z1: -HW, z2: HW, color: '#ffd23f', label: '短丁克', lx: 0.75, front: true },
        { x1: 1.45, x2: KL, z1: -HW, z2: HW, color: '#9be3b8', label: '長丁克' }
      ],
      setup: { A1: KP.A1, A2: KP.A2, B1: KP.B1, B2: KP.B2 },
      steps: [
        { hitter: 'A1', land: [0.45, 1.35], h: 1.15, dur: 1.5, cap: '短丁克：落在網前，逼對手往前撈', moves: { B2: [1.25, 1.4] } },
        { hitter: 'B2', land: [-1.8, -1.5], h: 1.2, dur: 1.6, cap: '對手撈起來，回到 藍 2 腳下', moves: { B2: KP.B2 } },
        { hitter: 'A2', land: [1.9, 2.55], h: 1.3, dur: 1.7, cap: '對角長丁克：落在廚房線附近，拉到外角', moves: { B2: [2.6, 2.9] } },
        { hitter: null, dur: 1.4, cap: '對手被拉出場外，中路出現空檔' }
      ]
    },
    specials: {
      S: 46, cy: 220, caption: true,
      setup: { A1: [-2.45, 1.6], A2: KP.A2, B1: KP.B1, B2: [2.45, 1.8] },
      steps: [
        { hitter: 'A1', land: [1.9, 2.4], h: 1.25, dur: 1.5, cap: '藍 1 先把球丁克到邊線附近', moves: { B2: [2.5, 2.5] } },
        { hitter: 'B2', land: null, h: 1.15, dur: 1.3, cap: '橘 2 打直線，藍 1 預判、從廚房旁移到場外', moves: { A1: [-0.7, 3.5] } },
        { hitter: 'A1', land: [3.3, 0.2], h: 0.95, dur: 0.6, color: DRIVE, tag: 'Erne', cap: 'Erne！在網邊直接截擊' },
        { hitter: null, dur: 0.9, cap: '', moves: { A1: [-2.45, 1.6], B2: KP.B2 } },
        { hitter: 'A2', land: [1.2, -2.95], h: 1.2, dur: 1.6, cap: 'ATP：外角短斜線，把 橘 1 拉出場外', moves: { B1: [1.9, -4.4] } },
        { hitter: 'B1', land: [-3.8, -2.2], h: 0.55, dur: 1.2, color: DRIVE, tag: 'ATP 繞網柱', tagT: 0.62, cap: '從網柱外繞回來，球比網還低' },
        { hitter: null, dur: 1.2, cap: '', moves: { B1: KP.B1 } }
      ]
    },
    rope: {
      S: 50, cy: 215, caption: true, rope: ['A1', 'A2'],
      setup: { A1: KP.A1, A2: KP.A2, B1: KP.B1, B2: KP.B2 },
      steps: [
        { hitter: 'B1', land: [-1.8, -2.4], h: 1.25, dur: 1.5, cap: '球往左邊來：兩人一起往左偏', moves: { A2: [-2.45, -2.4], A1: [-2.45, 0.5] } },
        { hitter: 'A2', land: [1.9, 2.2], h: 1.25, dur: 1.6, cap: '回對角', moves: { B2: [2.45, 2.2], B1: [2.45, -0.7] } },
        { hitter: 'B2', land: [-1.8, 2.3], h: 1.25, dur: 1.6, cap: '球往右邊來：兩人一起往右偏，封住中路', moves: { A1: [-2.45, 2.3], A2: [-2.45, -0.6] } },
        { hitter: null, dur: 1.3, cap: '兩人的距離一直維持約 3 公尺' }
      ]
    },
    stack: {
      S: 46, cy: 220, caption: true, hl: 'A1',
      setup: { A1: [-7.0, 1.3], A2: [-7.2, 3.5], B1: [6.9, -1.4], B2: [2.45, 1.5] },
      steps: [
        { hitter: 'A1', land: [5.0, -1.5], h: 2.1, dur: 1.7, cap: '疊位：藍 2 站在同一側場外', moves: { A1: [-6.4, -1.4], A2: [-6.6, 1.3] } },
        { hitter: 'B1', land: [-5.4, 1.2], h: 2.5, dur: 1.9, cap: '藍 1 換到左邊、藍 2 補右邊', moves: { B1: KP.B1 } },
        { hitter: 'A2', land: null, h: 1.15, dur: 0.8, color: DRIVE, dash: '10 4', tag: '抽球', cap: 'Shake：藍 2 第三拍抽球…', moves: { A1: [-2.8, -0.5] } },
        { hitter: 'B1', land: null, h: 1.2, dur: 0.9, cap: 'Bake：藍 1 衝網，對手只能擋出軟球', moves: { A1: [-2.7, -0.1] } },
        { hitter: 'A1', land: [3.3, 0.1], h: 1.0, dur: 0.55, color: DRIVE, tag: '截擊得分', cap: '打向對方兩人中間的腳下' },
        { hitter: null, dur: 1.3, cap: '' }
      ]
    }
  };

  /* ---------- 動畫播放管理：只播放畫面上看得到的圖 ---------- */
  var active = new Map();
  function loop(ts) {
    active.forEach(function (c) {
      if (!c.running) return;
      if (c.t0 === null) c.t0 = ts;
      var T = (ts - c.t0) / 1000;
      if (T > c.total + 1.2) { c.t0 = ts; T = 0; }
      c.frame(Math.min(T, c.total));
    });
    requestAnimationFrame(loop);
  }
  var ctls = {}, isoObserver = null, redrawRotator = null;
  function mountIso(svg) {
    var key = svg.dataset.iso;
    if (!SCENES[key]) return;
    var was = ctls[key] && ctls[key].running;
    var c = renderIso(svg, SCENES[key]);
    c.running = !!was;
    ctls[key] = c; active.set(key, c);
  }
  function initIsoFigures() {
    isoObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { var c = ctls[e.target.dataset.iso]; if (c) c.running = e.isIntersecting && !reduceMotion; });
    }, { threshold: 0.15 }) : null;
    $$('svg[data-iso]').forEach(function (svg) {
      if (!SCENES[svg.dataset.iso]) return;
      mountIso(svg);
      if (isoObserver) isoObserver.observe(svg); else ctls[svg.dataset.iso].running = !reduceMotion;
    });
    $$('[data-replay]').forEach(function (b) {
      b.addEventListener('click', function () { var c = ctls[b.dataset.replay]; if (c) { c.t0 = null; c.running = true; } });
    });
    requestAnimationFrame(loop);
  }
  /* 3D 模組把真人模型渲染成 2.5D 用的圖之後呼叫：換掉向量人像並重畫所有圖解 */
  window.PBIso = {
    setSprites: function (map) {
      SPRITES = map;
      $$('svg[data-iso]').forEach(function (svg) { if (SCENES[svg.dataset.iso]) mountIso(svg); });
      if (redrawRotator) redrawRotator();
      if (redrawDrill) redrawDrill();
    }
  };

  /* ============================================================
   * 發球輪替模擬器（傳統雙打計分）
   * ============================================================ */
  function initRotator() {
    var svg = $('#rot-svg'); if (!svg) return;
    var st, history;
    function reset() {
      st = { score: [0, 0], serving: 0, serverNum: 2, server: 'A1', pos: { A1: 'R', A2: 'L', B1: 'R', B2: 'L' }, over: false };
      history = ['0-0-2'];
      draw('開局：藍隊先發球，報 <b>0-0-2</b>。開局只有一位發球員，由站在右邊的藍 1 發球。');
    }
    function team(id) { return id[0] === 'A' ? 0 : 1; }
    function partner(id) { return id[0] + (id[1] === '1' ? '2' : '1'); }
    function call() { return st.score[st.serving] + '-' + st.score[1 - st.serving] + '-' + st.serverNum; }
    function coords(id) {
      var t = team(id), side = st.pos[id];
      var zSign = t === 0 ? (side === 'R' ? 1 : -1) : (side === 'R' ? -1 : 1);
      var x;
      if (t === st.serving) x = id === st.server ? -7.0 : -6.4; else {
        var receiverSide = st.pos[st.server]; // 對角接發：右對右、左對左
        x = side === receiverSide ? -7.0 : -2.5;
      }
      if (t === 1) x = -x;
      return [x, 1.5 * zSign];
    }
    var lastMsg = '';
    function draw(msg) {
      lastMsg = msg;
      var setup = {};
      ['A1', 'A2', 'B1', 'B2'].forEach(function (id) { setup[id] = coords(id); });
      var recv = ['A1', 'A2', 'B1', 'B2'].filter(function (id) { return team(id) !== st.serving && st.pos[id] === st.pos[st.server]; })[0];
      var r = coords(recv);
      var scene = {
        S: 44, cy: 205, hl: st.over ? null : st.server, setup: setup,
        steps: st.over ? [] : [{ hitter: st.server, land: [r[0] > 0 ? 4.8 : -4.8, r[1]], h: 2.1, dur: 1.6 }, { hitter: null, dur: 1.1 }]
      };
      var c = renderIso(svg, scene);
      ctls.rotator = c; active.set('rotator', c); c.running = !reduceMotion; c.t0 = null;
      $('#rot-call').textContent = call();
      var tn = st.serving === 0 ? '藍隊' : '橘隊';
      $('#rot-meta').innerHTML = '發球方：<b>' + tn + '</b><br>發球員：<b>' + NAMES[st.server] + '</b>（第 ' + st.serverNum + ' 發球員）<br>發球位置：<b>' + (st.pos[st.server] === 'R' ? '右區（偶數區）' : '左區（奇數區）') + '</b>';
      $('#rot-log').innerHTML = msg;
      $('#rot-history').innerHTML = history.map(function (h) { return '<span>' + h + '</span>'; }).join('');
      $('#rot-win').disabled = $('#rot-lose').disabled = st.over;
    }
    function checkOver() {
      var a = st.score[0], b = st.score[1];
      if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2) { st.over = true; return (a > b ? '藍隊' : '橘隊') + '以 ' + Math.max(a, b) + ':' + Math.min(a, b) + ' 贏得這局！'; }
      return '';
    }
    $('#rot-win').addEventListener('click', function () {
      if (st.over) return;
      st.score[st.serving]++;
      var p = partner(st.server);
      var tmp = st.pos[st.server]; st.pos[st.server] = st.pos[p]; st.pos[p] = tmp;
      history.push(call());
      var over = checkOver();
      draw(over ? '<b>' + over + '</b>' : '發球方得分。<b>' + NAMES[st.server] + '</b> 和隊友交換左右，繼續發球，改從' + (st.pos[st.server] === 'R' ? '右' : '左') + '區發。報 <b>' + call() + '</b>。');
    });
    $('#rot-lose').addEventListener('click', function () {
      if (st.over) return;
      var msg;
      if (st.serverNum === 1) {
        st.serverNum = 2; st.server = partner(st.server);
        msg = '第 1 發球員失分。換隊友 <b>' + NAMES[st.server] + '</b> 當第 2 發球員，站在原位置（' + (st.pos[st.server] === 'R' ? '右' : '左') + '區）發球，不交換左右。';
      } else {
        st.serving = 1 - st.serving; st.serverNum = 1;
        var t = st.serving === 0 ? 'A' : 'B';
        st.server = st.pos[t + '1'] === 'R' ? t + '1' : t + '2';
        msg = '第 2 發球員失分，<b>換發（Side Out）</b>。發球權交給' + (st.serving === 0 ? '藍隊' : '橘隊') + '，由站在右區的 <b>' + NAMES[st.server] + '</b> 當第 1 發球員。';
      }
      history.push(call());
      draw(msg + ' 報 <b>' + call() + '</b>。');
    });
    $('#rot-reset').addEventListener('click', reset);
    reset();
    redrawRotator = function () { draw(lastMsg); };
  }

  /* ============================================================
   * 站位練習題：在 2.5D 球場上點選站位，依距離判斷對錯
   * 你永遠是藍 1（近端、面向球網，右手邊是 +z）
   * ============================================================ */
  var DRILLS = [
    { q: '橘 1 發球給你的隊友藍 2（右區底線）。你是接發方的隊友，這時應該站在哪裡？',
      setup: { A2: [-7.0, 1.5], B1: [7.0, -1.5], B2: [6.4, 1.5] },
      arcs: [{ a: [7.0, 0.5, -1.5], b: [-5.2, 0.03, 1.4], h: 2.1, ball: 0.6 }],
      target: [-2.45, -1.5], r: 0.8,
      why: '接發方的隊友不受雙跳規則限制，一開始就站在左區廚房線後。隊友回完球衝上來，你們就兩人都在網前。' },
    { q: '你從右區發球。發完球、對手還沒回球前，你應該站在哪裡？',
      setup: { A2: [-6.4, -1.5], B1: [7.0, -1.5], B2: [2.45, 1.5] },
      ghost: [-7.0, 1.5], ghostText: '你發球的位置',
      arcs: [{ a: [-6.65, 0.5, 1.8], b: [5.0, 0.03, -1.5], h: 2.1, ball: 0.75 }],
      target: [-6.7, 1.3], r: 0.9,
      why: '雙跳規則：回發球一定要讓它彈地，所以發球方要留在底線附近。往前衝的話，深的回球會落在你腳邊，很難處理。' },
    { q: '你在右區底線，剛把發球回深。回完球之後，你要去哪裡？',
      setup: { A2: [-2.45, -1.5], B1: [7.0, -1.5], B2: [6.4, 1.5] },
      ghost: [-7.0, 1.5], ghostText: '你回球的位置',
      arcs: [{ a: [-6.65, 0.85, 1.8], b: [5.8, 0.03, -0.4], h: 2.5, ball: 0.55 }],
      target: [-2.45, 1.5], r: 0.8,
      why: '回深之後立刻往前衝到右區的廚房線，和隊友並排。接發方這時比發球方早一步站上網前，這是接發方最大的優勢。' },
    { q: '丁克戰中，橘 2 被拉到他那側的邊線附近準備回球。你在右邊，應該怎麼站？',
      setup: { A2: [-2.45, -0.8], B1: [2.45, -0.6], B2: [2.6, 2.8] },
      ghost: [-2.45, 1.5], ghostText: '你原本的位置',
      arcs: [{ a: [-2.1, 0.85, 1.8], b: [1.95, 0.03, 2.75], h: 1.25, ball: 0.95 }],
      target: [-2.45, 2.15], r: 0.6,
      why: '球在哪一側，兩人就一起往那一側偏（Shading）。離球近的你往邊線靠、封住直線；隊友往中間補，對角交給隊友。' },
    { q: '隊友藍 2 被外角球拉到左邊線外。這時你應該移到哪裡？',
      setup: { A2: [-2.45, -3.1], B1: [2.45, -1.2], B2: [2.45, 1.5] },
      ghost: [-2.45, 1.5], ghostText: '你原本的位置',
      arcs: [{ a: [2.1, 0.85, -1.5], b: [-1.9, 0.03, -2.9], h: 1.25, ball: 0.9 }],
      target: [-2.45, 0.0], r: 0.75,
      why: '兩人像被一條約 3 公尺的繩子綁著。隊友往外，你就往中間補。留在原地的話，中路會出現一個大洞。' },
    { q: '對手挑高球，越過隊友藍 2 的頭頂，球會落在左後場。你在右邊，應該跑去哪裡？',
      setup: { A2: [-2.45, -1.5], B1: [2.45, -1.5], B2: [2.45, 1.5] },
      ghost: [-2.45, 1.5], ghostText: '你原本的位置',
      arcs: [{ a: [2.1, 0.85, -1.8], b: [-5.9, 0.03, -1.6], h: 4.6, ball: 0.55 }],
      target: [-5.9, -1.4], r: 1.0,
      why: '喊「Switch！」由你斜著往後追，因為你看得到球、角度比較好。被挑的隊友橫移補到右邊，兩人交換左右。' },
    { q: '你是發球方，從底線打出一個好的第三拍放短，球正落進對方廚房。你下一步應該停在哪裡？',
      setup: { A2: [-5.6, -1.4], B1: [2.45, -1.5], B2: [2.45, 1.5] },
      ghost: [-6.8, 1.2], ghostText: '你擊球的位置',
      arcs: [{ a: [-6.45, 0.85, 1.5], b: [1.1, 0.03, 0.9], h: 1.95, ball: 0.85 }],
      target: [-4.2, 1.3], r: 1.1,
      why: '放短後往前走 2–3 步，在對手擊球前停下做 split step，大約停在過渡區中段。對手回得軟再繼續上網；一口氣衝到底，很容易被打腳下。' },
    { q: '開局 0-0-2，你從右區發球並得分。下一球你應該站在哪裡發球？',
      setup: { B1: [2.45, -1.5], B2: [7.0, 1.5] },
      ghost: [-7.0, 1.5], ghostText: '剛才發球的位置',
      arcs: [],
      target: [-7.1, -1.5], r: 0.9, behindBaseline: true,
      why: '發球方得分後，發球員和隊友交換左右，同一個人繼續發。所以你改到左區（奇數區）發到對角。腳要站在底線後面，不能踩線。' }
  ];
  var redrawDrill = null;
  function initDrill() {
    var svg = $('#drill-svg'); if (!svg) return;
    var idx = 0, results = [], attempt = null, overlay = null, ctl = null, locked = false;
    var bar = $('#drill-progress');
    bar.innerHTML = DRILLS.map(function () { return '<i></i>'; }).join('');
    function circlePts(P, c, r) {
      var pts = [];
      for (var i = 0; i < 36; i++) { var a = i / 36 * Math.PI * 2, q = P(c[0] + Math.cos(a) * r, 0.01, c[1] + Math.sin(a) * r); pts.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
      return pts.join(' ');
    }
    function toCourt(evt) {
      var pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
      var m = svg.getScreenCTM(); if (!m) return null;
      var loc = pt.matrixTransform(m.inverse());
      var X = (loc.x - ctl.vb[2] / 2) / ctl.S, D = (loc.y - ctl.cy) / (ctl.S * TILT);
      return [X * COS - D * SIN, X * SIN + D * COS];
    }
    function render() {
      var d = DRILLS[idx];
      ctl = renderIso(svg, { S: 48, cy: 215, setup: d.setup, steps: [] });
      var P = ctl.P;
      overlay = el('g', {}, svg);
      if (d.ghost) {
        el('polygon', { points: circlePts(P, d.ghost, 0.35), style: 'fill:none;stroke:var(--team-a);stroke-width:2;stroke-dasharray:4 4' }, overlay);
        text3(P, d.ghost[0], 0, d.ghost[1] + 0.75, d.ghostText, 'font:700 12px var(--f-body);fill:var(--team-a);paint-order:stroke;stroke:var(--surface);stroke-width:3px', overlay);
      }
      d.arcs.forEach(function (a) {
        var sg = { a: a.a, b: a.b, arc: Math.max(0.05, a.h - (a.a[1] + a.b[1]) / 2) }, pts = [];
        for (var i = 0; i <= 28; i++) { var p = ballAt(sg, i / 28), q = P(p[0], p[1], p[2]); pts.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
        el('polyline', { points: pts.join(' '), style: 'fill:none;stroke:var(--ball);stroke-width:2.5;stroke-dasharray:6 5' }, overlay);
        var bp = P(a.b[0], 0, a.b[2]);
        el('ellipse', { cx: bp[0], cy: bp[1], rx: 9, ry: 4, style: 'fill:none;stroke:var(--ball);stroke-width:2' }, overlay);
        var bb = ballAt(sg, a.ball), q2 = P(bb[0], bb[1], bb[2]), sh = P(bb[0], 0, bb[2]);
        el('ellipse', { cx: sh[0], cy: sh[1], rx: 5, ry: 2.2, style: 'fill:rgba(0,0,0,.35)' }, overlay);
        el('circle', { cx: q2[0], cy: q2[1], r: 6, style: 'fill:var(--ball);stroke:#5a6b12;stroke-width:1' }, overlay);
      });
      $('#drill-count').textContent = '第 ' + (idx + 1) + ' / ' + DRILLS.length + ' 題';
      $('#drill-q').textContent = d.q;
      $$('i', bar).forEach(function (b, i) { b.className = results[i] || (i === idx ? 'cur' : ''); });
      $('#drill-score').textContent = '得分 ' + results.filter(function (r) { return r === 'ok'; }).length;
      if (attempt) place(attempt, true); else { $('#drill-fb').hidden = true; $('#drill-tip').hidden = false; }
      svg.classList.toggle('locked', locked);
      $('#drill-retry').hidden = !locked;
      $('#drill-next').textContent = idx === DRILLS.length - 1 ? '看成績' : '下一題';
    }
    function showAnswer(P, d) {
      el('polygon', { points: circlePts(P, d.target, d.r), style: 'fill:rgba(43,122,88,.35);stroke:#2b7a58;stroke-width:2.5' }, overlay);
      text3(P, d.target[0], 0, d.target[1] + d.r + 0.45, '正確位置', 'font:800 13px var(--f-body);fill:#2b7a58;paint-order:stroke;stroke:var(--surface);stroke-width:4px', overlay);
    }
    function place(xz, redraw) {
      var d = DRILLS[idx], P = ctl.P;
      showAnswer(P, d);
      if (xz !== 'answer') {
        Player(overlay, P, { id: 'A1', team: 'A', x: xz[0], z: xz[1], label: '你', hl: true });
      }
      if (redraw) return;
    }
    function judge(xz) {
      var d = DRILLS[idx];
      var dist = Math.hypot(xz[0] - d.target[0], xz[1] - d.target[1]);
      var res = dist <= d.r ? 'ok' : dist <= d.r * 1.9 ? 'near' : 'bad';
      var extra = '';
      if (d.behindBaseline && xz[0] > -HL) { res = 'bad'; extra = '你站進場內了，發球時雙腳都要在底線後面。'; }
      return { res: res, extra: extra };
    }
    function feedback(res, extra) {
      var d = DRILLS[idx], fb = $('#drill-fb');
      var title = { ok: '答對了！', near: '很接近了，再調整一點。', bad: '不太對。', answer: '正確答案' }[res];
      fb.className = 'drill-fb ' + (res === 'answer' ? 'near' : res);
      fb.innerHTML = '<b class="res">' + title + '</b>' + (extra ? '<span>' + extra + '</span>' : '') + '<span>' + d.why + '</span>';
      fb.hidden = false;
      $('#drill-tip').hidden = true;
    }
    svg.addEventListener('click', function (e) {
      if (locked || !ctl) return;
      var xz = toCourt(e); if (!xz) return;
      if (Math.abs(xz[0]) > HL + 2.2 || Math.abs(xz[1]) > HW + 1.6) return;
      var j = judge(xz);
      if (!results[idx]) results[idx] = j.res;
      attempt = xz; locked = true;
      render();
      feedback(j.res, j.extra);
    });
    $('#drill-show').addEventListener('click', function () {
      if (!results[idx]) results[idx] = 'bad';
      locked = true; attempt = null; render(); place('answer'); feedback('answer', '');
    });
    $('#drill-retry').addEventListener('click', function () { locked = false; attempt = null; render(); });
    var finished = false;
    $('#drill-next').addEventListener('click', function () {
      if (finished) { finished = false; idx = 0; results = []; attempt = null; locked = false; render(); return; }
      if (idx === DRILLS.length - 1) {
        var ok = results.filter(function (r) { return r === 'ok'; }).length;
        var fb = $('#drill-fb');
        fb.className = 'drill-fb ' + (ok >= 6 ? 'ok' : ok >= 4 ? 'near' : 'bad');
        fb.innerHTML = '<b class="res">完成！答對 ' + ok + ' / ' + DRILLS.length + ' 題</b><span>' + (ok >= 6 ? '站位觀念很紮實，可以上場帶新手了。' : ok >= 4 ? '基本觀念有了，再回頭看「走位與補位」章節和 3D 實驗室。' : '建議先看「每一拍的任務」和「走位與補位」，再挑戰一次。') + '</span>';
        fb.hidden = false;
        finished = true; locked = true;
        $('#drill-next').textContent = '重新開始';
        $('#drill-retry').hidden = true;
        return;
      }
      idx++; attempt = null; locked = false; render();
    });
    render();
    redrawDrill = function () { render(); if (locked && !attempt) place('answer'); };
  }

  /* ============================================================
   * 目錄、閱讀進度、程度篩選、主題
   * ============================================================ */
  function initNav() {
    var list = $('#toc-list');
    var secs = $$('section[data-toc]');
    secs.forEach(function (s) {
      var li = document.createElement('li');
      li.innerHTML = '<a href="#' + s.id + '">' + s.dataset.toc + '</a>';
      li.dataset.for = s.id;
      list.appendChild(li);
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          if (!e.isIntersecting) return;
          $$('#toc-list a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      secs.forEach(function (s) { io.observe(s); });
    }
    var bar = $('#progress');
    function prog() {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
    }
    addEventListener('scroll', prog, { passive: true }); prog();

    function applyLevel(lv) {
      $$('.level-filter button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.level === lv)); });
      secs.forEach(function (s) {
        var hide = lv !== 'all' && (s.dataset.levels || '').split(' ').indexOf(lv) === -1;
        s.classList.toggle('is-hidden', hide);
        var li = $('#toc-list li[data-for="' + s.id + '"]'); if (li) li.hidden = hide;
      });
      store.set('pb-level', lv);
    }
    $$('.level-filter button').forEach(function (b) { b.addEventListener('click', function () { applyLevel(b.dataset.level); }); });
    applyLevel(store.get('pb-level') || 'all');

    $('#theme-btn').addEventListener('click', function () {
      var root = document.documentElement;
      var curDark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      var next = curDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next); store.set('pb-theme', next);
    });
  }

  /* ============================================================
   * 內容資料：常見錯誤、術語、測驗
   * ============================================================ */
  var MISTAKES = [
    ['發球求快求狠，失誤一堆', '發球先求穩和深。一場發球失誤 2 次以上，就是在送分。'],
    ['回完發球站在底線不動', '回完馬上往前走到廚房線，接發方先天就有上網的優勢。'],
    ['站在過渡區不前不後', '要嘛在底線、要嘛在廚房線。經過過渡區時，對手擊球前記得 split step。'],
    ['握拍握太緊', '平時握力 3–4 分（滿分 10），丁克時更輕，才打得出軟球。'],
    ['拍子垂在腰下', '打完每一球把拍子拉回胸前，網前快球才來得及反應。'],
    ['低於網的球硬要攻擊', '球低於網時繼續丁克，等對手打出高於網的球才攻。'],
    ['第三拍一直抽球', '對手已經在網前時，放短比抽球更能幫你上網。'],
    ['丁克時只動手不動腳', '先移動到球的後面，再用肩膀送球。'],
    ['截擊後衝進廚房', '截擊後保持平衡；站在離廚房線約一個腳掌的位置。'],
    ['倒退跑去追挑高球', '側身交叉步往後，或讓隊友斜向補位（Switch）。'],
    ['兩人一前一後站位', '和隊友一起上、一起退，保持繩子效應。'],
    ['中路球兩人都不接', '事先講好誰負責中路（通常是正手在中間的人），比賽中要出聲。'],
    ['永遠只打同一個方向', '直線、對角、中路混著打，讓對手猜不到。'],
    ['看球不看對手的拍面', '對手拍面朝上是軟球或挑高，拍面朝下是攻擊，提早判斷。'],
    ['輸球就想換更貴的拍子', '大多數問題是步伐和選球。先練基本功，再考慮換拍。']
  ];
  var GLOSSARY = [
    ['Dink', '丁克', '在網前打進對方廚房的軟球'],
    ['Kitchen / NVZ', '廚房 / 非截擊區', '網前 2.13 公尺的區域，在裡面不能截擊'],
    ['Volley', '截擊', '球落地前直接在空中擊球'],
    ['Two-Bounce Rule', '雙跳規則', '發球和回發球都要讓球彈地一次'],
    ['Third Shot Drop', '第三拍放短', '發球方的第三拍打進對方廚房的軟球'],
    ['Drive', '抽球', '又低又平又快的擊球'],
    ['Reset', '重置', '把快球卸力打回廚房，讓回合回到丁克'],
    ['Speed-up', '突擊', '丁克戰中突然加速攻擊'],
    ['Counter', '反擊', '對手突擊時直接反打回去'],
    ['Hands Battle', '快手對攻', '雙方在網前連續快速截擊'],
    ['Lob', '挑高球', '越過對手頭頂的高球'],
    ['Overhead / Smash', '殺球', '高舉過頭的扣殺'],
    ['Erne', 'Erne', '從廚房旁的場外直接在網邊截擊'],
    ['ATP', '繞網柱', 'Around The Post，從網柱外側把球打回去'],
    ['Poach', '搶攻', '跨過中線去截擊原本是隊友的球'],
    ['Stacking', '疊位', '發球或接發時兩人站同一側，之後再換到固定位置'],
    ['Shake & Bake', '抽球加衝網', '第三拍抽球時隊友衝網搶攻第四拍'],
    ['Transition Zone', '過渡區', '底線和廚房線之間的區域'],
    ['Split Step', '分腿墊步', '對手擊球時小跳落地，準備往任何方向起動'],
    ['Side Out', '換發', '發球權轉到另一隊'],
    ['Rally Scoring', '每球得分制', '每一球都會得分，不分發球方或接發方'],
    ['Let', '擦網重發', '已取消，發球擦網落在正確區域就繼續打'],
    ['Punch Volley', '推擊截擊', '短促前推的攻擊截擊'],
    ['Roll Volley', '上旋截擊', '由下往上刷的截擊，讓球往下掉'],
    ['Shading', '偏移站位', '隨球的位置兩人一起偏向一側'],
    ['Nasty Nelson', 'Nasty Nelson', '發球時故意打到接發方的隊友，合法但不禮貌'],
    ['DUPR', 'DUPR 積分', '依比賽結果計算的全球動態積分系統'],
    ['Open Play', '自由排隊打', '球場開放時段，大家排隊輪流組隊比賽'],
    ['Pickled', '被醃', '一局 0 分輸掉（11:0）'],
    ['Falafel', 'Falafel', '球打太短、沒過網或沒力的球（俚語）']
  ];
  var QUIZ = [
    ['雙打開局時，先發球的隊伍要怎麼報分？', ['0-0-1', '0-0-2', '0-0', '1-0-0'], 1, '開局只有一位發球員，所以從「第 2 發球員」開始，報 0-0-2。'],
    ['發球落在對方廚房線上，算？', ['好球', '失誤', '重發', '由對方決定'], 1, '廚房線屬於廚房，發球落在廚房線上是失誤。'],
    ['以下哪一拍一定要等球彈地？', ['第 4 拍', '第 5 拍', '回發球（第 2 拍）', '丁克'], 2, '雙跳規則：發球和回發球都要讓球彈地，第 2 拍和第 3 拍都不能截擊。'],
    ['接發方贏了這一球，會發生什麼事？', ['接發方得 1 分', '發球方換下一位發球員或換發', '雙方都不變', '接發方得 2 分'], 1, '傳統計分只有發球方能得分。接發方贏球只會讓發球方換人或換發。'],
    ['截擊後因為慣性一隻腳踩進廚房，球已經落地得分了，算？', ['得分有效', '失誤', '重打', '看裁判心情'], 1, '截擊動作造成的慣性踩進廚房，就算球已經死了也是失誤。'],
    ['發球方得分後，誰要交換左右？', ['接發方兩人', '發球方兩人', '四個人都換', '都不換'], 1, '只有發球方在得分後交換左右，接發方永遠不換。'],
    ['哪一種丁克容錯率最高？', ['直線短丁克', '對角丁克', '高吊丁克', '打到對手身上'], 1, '對角線距離最長，而且中間的網比較低（86.4 公分），容錯率最高。'],
    ['對手球低於網、落在你面前，最好的選擇是？', ['用力抽球', '殺球', '繼續丁克', '挑高球'], 2, '球低於網時要往上打，攻擊很容易出界或被反擊，應該繼續丁克等待機會。'],
    ['Erne 什麼情況下合法？', ['腳踩在廚房裡截擊', '起跳前沒碰到廚房，落在場外', '一定要跨過網', '只能在單打使用'], 1, '只要起跳前沒有踩到廚房（含廚房線），從廚房旁的場外截擊就是合法的。'],
    ['中路球通常由誰接比較好？', ['反手在中間的人', '正手在中間的人', '離網最遠的人', '誰都可以，不用講'], 1, '一般原則是正手在中間的人負責中路，並事先和隊友溝通好。']
  ];
  function initData() {
    var mr = $('#mistake-rows');
    if (mr) mr.innerHTML = MISTAKES.map(function (m, i) { return '<tr><td class="num">' + (i + 1) + '</td><td><b>' + m[0] + '</b></td><td>' + m[1] + '</td></tr>'; }).join('');
    var gr = $('#glossary-rows');
    if (gr) gr.innerHTML = GLOSSARY.map(function (g) { return '<tr><td><span class="en">' + g[0] + '</span></td><td><b>' + g[1] + '</b></td><td>' + g[2] + '</td></tr>'; }).join('');
    var ql = $('#quiz-list'); if (!ql) return;
    var right = 0, answered = 0;
    QUIZ.forEach(function (q, qi) {
      var box = document.createElement('div'); box.className = 'q';
      box.innerHTML = '<div class="q-title">' + (qi + 1) + '. ' + q[0] + '</div><div class="q-opts"></div><div class="q-exp" hidden></div>';
      var opts = $('.q-opts', box);
      q[1].forEach(function (o, oi) {
        var b = document.createElement('button'); b.type = 'button'; b.id = 'q' + qi + 'o' + oi; b.textContent = o;
        b.addEventListener('click', function () {
          $$('button', opts).forEach(function (x, xi) { x.disabled = true; if (xi === q[2]) x.classList.add('right'); });
          if (oi === q[2]) right++; else b.classList.add('wrong');
          answered++;
          var exp = $('.q-exp', box); exp.hidden = false; exp.textContent = (oi === q[2] ? '答對了！' : '答錯了。') + q[3];
          $('#quiz-score').textContent = right + ' / ' + QUIZ.length + (answered === QUIZ.length ? (right >= 8 ? '　可以上場了！' : '　再複習一下規則章節') : '');
        });
        opts.appendChild(b);
      });
      ql.appendChild(box);
    });
  }

  /* ============================================================
   * 影片
   * ============================================================ */
  function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function initVideos() {
    var box = $('#video-list'); if (!box || !window.PB_VIDEOS) return;
    var cfg = window.PB_CONFIG || {};
    // 直接雙擊 index.html（file://）時瀏覽器不會送出網址來源，YouTube 會顯示「播放器設定錯誤」，所以改成連結卡片
    var isFile = location.protocol === 'file:';
    var embed = cfg.embedVideos !== false && !isFile && !/claude|anthropic/i.test(location.hostname);
    var CAT = { pro: '職業賽', openplay: 'Open Play', lesson: '教學' };
    var note = $('#video-note');
    if (isFile && note) { note.hidden = false; note.innerHTML = '目前是直接開啟檔案，YouTube 不允許在這種模式下嵌入播放。請改用資料夾裡的 <b>開啟攻略.bat</b>（會啟動本機網址），或點卡片到 YouTube 觀看精華段落。'; }
    window.PB_VIDEOS.forEach(function (v) {
      var url = 'https://www.youtube.com/watch?v=' + v.id + (v.start ? '&t=' + v.start + 's' : '');
      var range = v.start || v.end ? fmt(v.start || 0) + (v.end ? '–' + fmt(v.end) : ' 起') : '整支都是精華';
      var card = document.createElement('article'); card.className = 'video'; card.dataset.cat = v.category;
      var frame;
      if (embed) {
        var src = 'https://www.youtube.com/embed/' + v.id + '?rel=0&playsinline=1&start=' + (v.start || 0) + (v.end ? '&end=' + v.end : '');
        frame = '<div class="video-frame"><iframe src="' + src + '" title="' + v.title.replace(/"/g, '&quot;') + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
      } else {
        frame = '<div class="video-frame"><a class="video-poster" href="' + url + '" target="_blank" rel="noopener">' +
          '<img class="vp-img" src="https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">' +
          '<span class="vp-src">' + CAT[v.category] + ' · ' + range + '</span><span class="play" aria-hidden="true">▶</span><span class="vp-t">在 YouTube 觀看精華段落</span></a></div>';
      }
      card.innerHTML = frame +
        '<div class="video-body"><div class="eyebrow"><span class="tag ' + (v.category === 'pro' ? 'l2' : 'l3') + '">' + CAT[v.category] + '</span><span class="num">精華 ' + range + '</span></div>' +
        '<h4>' + v.title + '</h4><p>' + v.note + '</p><p><b style="color:var(--ink)">觀摩重點：</b>' + v.watch + '</p>' +
        '<div class="video-src"><span>出處：' + v.channel + '（YouTube）</span><a href="' + url + '" target="_blank" rel="noopener">原片連結 ↗</a></div></div>';
      box.appendChild(card);
    });
    $$('.video-filter button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.video-filter button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $$('.video', box).forEach(function (c) { c.hidden = b.dataset.vf !== 'all' && c.dataset.cat !== b.dataset.vf; });
      });
    });
  }

  /* ============================================================
   * 斗內
   * ============================================================ */
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
  }
  function initDonate() {
    var grid = $('#donate-grid'); var d = (window.PB_CONFIG || {}).donate; if (!grid || !d) return;
    function isPh(v) { return !v || /你的/.test(v); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    var cards = [];
    if (d.paypal && d.paypal.url) cards.push({ name: 'PayPal', color: '#003087', ico: 'PP', note: d.paypal.note, url: d.paypal.url, btn: '用 PayPal 斗內', ph: isPh(d.paypal.url) });
    if (d.linePay && (d.linePay.url || d.linePay.qr)) cards.push({ name: 'LINE Pay', color: '#06c755', ico: 'LINE', note: d.linePay.note, url: d.linePay.url, qr: d.linePay.qr, btn: '開啟 LINE', ph: isPh(d.linePay.url) || /placeholder/.test(d.linePay.qr || '') });
    if (d.jkoPay && (d.jkoPay.url || d.jkoPay.qr)) cards.push({ name: '街口支付', color: '#d71f26', ico: 'JK', note: d.jkoPay.note, url: d.jkoPay.url, qr: d.jkoPay.qr, btn: '開啟街口', ph: isPh(d.jkoPay.url) });
    if (d.bank && d.bank.account) cards.push({ name: '銀行轉帳', color: '#1d5d9b', ico: 'ATM', note: d.bank.note, bank: d.bank, ph: isPh(d.bank.account) });
    if (d.buyMeACoffee && d.buyMeACoffee.url) cards.push({ name: 'Buy Me a Coffee', color: '#b8860b', ico: 'BMC', note: d.buyMeACoffee.note, url: d.buyMeACoffee.url, btn: '請我喝咖啡', ph: isPh(d.buyMeACoffee.url) });
    cards.forEach(function (c, i) {
      var div = document.createElement('div'); div.className = 'dn' + (c.ph ? ' placeholder' : '');
      var h = '<h4><span class="dn-ico" style="background:' + c.color + '">' + c.ico + '</span>' + c.name + '</h4><p>' + esc(c.note || '') + '</p>';
      if (c.qr) h += '<img class="qr" src="' + esc(c.qr) + '" alt="' + c.name + ' 收款 QR code">';
      if (c.bank) h += '<div class="mono" id="bank-acct">' + esc(c.bank.bankName) + '<br>' + esc(c.bank.account) + '<br>戶名：' + esc(c.bank.holder) + '</div><button type="button" class="btn small primary" id="bank-copy">複製帳號</button>';
      if (c.url) h += '<a class="btn small primary" href="' + esc(c.url) + '" target="_blank" rel="noopener">' + c.btn + '</a>';
      if (c.ph) h += '<span class="ph-note">站長尚未設定：請編輯 js/config.js</span>';
      div.innerHTML = h; grid.appendChild(div);
    });
    var cb = $('#bank-copy');
    if (cb) cb.addEventListener('click', function () {
      var acct = d.bank.account;
      var done = function () { toast('已複製帳號'); };
      var fail = function () { var r = document.createRange(); r.selectNodeContents($('#bank-acct')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('已選取帳號，請按 Ctrl+C 複製'); };
      try { navigator.clipboard.writeText(acct).then(done, fail); } catch (e) { fail(); }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav(); initIsoFigures(); initRotator(); initDrill(); initData(); initVideos(); initDonate();
  });
})();
