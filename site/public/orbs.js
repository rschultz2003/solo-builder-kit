/* ============================================================
   orbs.js — the single transform authority for the orbs.

   Loaded byte-for-byte identically by / and /playbook, so the two
   pages cannot drift. Plain ES5, no dependencies, no build step.

   Nothing else in the site may write `transform` on an orb. Float,
   scroll parallax, drag and thrown momentum are all inputs that
   compose into one value, written once per frame:

       rendered = R(scrollY) + p

   R is the scroll-derived rest position, p is the physics offset.
   Physics acts only on p, which decays to zero. Keeping scroll out
   of the integrator means scrolling is exact and instantaneous
   rather than something the spring has to chase.

   prefers-reduced-motion: this module returns before building
   anything. The authored .orb elements stay exactly where the CSS
   puts them, static. No layer, no loop, no listeners.
   ============================================================ */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var anchors = [].slice.call(document.querySelectorAll(".orb"));
  if (!anchors.length) return;

  var orbs = [];
  var layer = null;
  var vw = 0, vh = 0;
  var scrollY = 0;
  var running = false;
  var dirty = true;          /* transforms need rewriting (scroll/resize) */
  var lastT = 0;
  var dragging = 0;          /* how many orbs are currently held */

  var DT_MAX = 0.032;        /* clamp so a backgrounded tab cannot teleport orbs */

  var SAMPLE_MS = 100;       /* velocity is measured over this trailing window */
  var SAMPLE_MAX = 5;
  var THROW_MAX = 4200;      /* px/s, guards against absurd flick velocities */

  /* ---- feel: heavy glass marble in light air ----
     Both constants scale with radius off a 60px reference, so a big orb
     coasts further and returns home more slowly: it reads as heavier.
     Air drag is the only damping. Because AIR scales as sqrt(r0/r) and
     the spring K as (r0/r), the damping ratio AIR/(2*sqrt(K)) lands at
     ~0.95 for every size, so orbs of any radius settle just shy of
     critical damping without oscillating. */
  var R_REF = 60;
  var AIR = 1.5;             /* velocity decays as exp(-AIR*dt): per second, not per frame */
  var SPRING = 0.62;         /* omega^2 of the settle spring */
  var BOUNCE = 0.76;         /* wall restitution */
  var WALL_FRICTION = 0.94;  /* tangential loss on impact */
  var FLIGHT_V = 55;         /* px/s: below this, walls stop being enforced */
  var SLEEP_V = 8;           /* px/s */
  var SLEEP_P = 0.6;         /* px */

  /* A spring approaches rest asymptotically, so the last stretch is a
     crawl: measured, a hard throw finished bouncing by ~3s but did not
     reach the sleep threshold until ~12s, holding the rAF loop open for
     nine seconds of motion nobody can see. Once an orb is both slow and
     close, ease the remainder home over ~0.8s instead. It reads as the
     orb arriving rather than creeping, and it sleeps far sooner. */
  var CALM_P = 40;           /* px */
  var CALM_V = 70;           /* px/s */
  var CALM_RATE = 6;         /* per second */

  /* ---- document-space position, immune to ancestor transforms ----
     .capture sits inside a .reveal that animates translateY(22px) -> none,
     so getBoundingClientRect would capture a pre-reveal position and bake
     the offset in permanently. offsetTop/offsetLeft are layout positions
     and ignore transforms, which is exactly what an anchor needs. */
  function docPos(el) {
    var x = 0, y = 0, n = el;
    while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x: x, y: y };
  }

  function build() {
    layer = document.createElement("div");
    layer.className = "orb-layer";
    layer.setAttribute("aria-hidden", "true");

    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      var el = document.createElement("div");
      /* carry the visual classes (orb-a / orb-b / orb-c / orb-glass) across;
         geometry and opacity live on the anchor's #id rules, so copy the
         computed values onto the live orb instead of the selector */
      el.className = a.className + " orb-live";
      a.classList.add("orb-anchor");

      orbs.push({
        anchor: a,
        el: el,
        depth: parseFloat(a.getAttribute("data-depth")) || 0.15,
        ax: 0, ay: 0, w: 0, h: 0, rad: 0,
        px: 0, py: 0,          /* physics offset */
        vx: 0, vy: 0,          /* px per second */
        live: false,           /* anchor is laid out (not display:none) */
        asleep: true,
        held: false,
        pid: -1,               /* pointerId of the holding pointer */
        gx: 0, gy: 0,          /* grab offset, so the orb does not snap to the cursor */
        samples: []            /* trailing pointer samples, for throw velocity */
      });
      bind(orbs[orbs.length - 1]);
      layer.appendChild(el);
    }
    document.body.appendChild(layer);
    measure();
  }

  /* ---- all layout reads happen here, never in the loop ---- */
  function measure() {
    vw = document.documentElement.clientWidth;
    vh = document.documentElement.clientHeight;
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      var w = o.anchor.offsetWidth, h = o.anchor.offsetHeight;
      o.live = w > 0 && h > 0;               /* #o3 is display:none <=860px */
      o.el.style.display = o.live ? "" : "none";
      if (!o.live) continue;
      var p = docPos(o.anchor);
      o.ax = p.x; o.ay = p.y;
      o.w = w; o.h = h; o.rad = w / 2;
      o.air = AIR * Math.sqrt(R_REF / o.rad);
      o.k = SPRING * (R_REF / o.rad);
      o.el.style.width = w + "px";
      o.el.style.height = h + "px";
      o.el.style.opacity = getComputedStyle(o.anchor).opacity;
    }
    dirty = true;
    wake();
  }

  function restX(o) { return o.ax; }
  function restY(o) { return o.ay - scrollY * (1 + o.depth); }

  function draw(o) {
    o.el.style.transform =
      "translate3d(" + (restX(o) + o.px) + "px," + (restY(o) + o.py) + "px,0)";
  }

  /* ---- integrate one orb ----
     Semi-implicit Euler on the physics offset p. Everything is in
     seconds, so behaviour is identical at 60Hz, 120Hz ProMotion, and
     on a throttled tab (where dt is clamped to DT_MAX).

     Walls act on the rendered position, but only while the orb still
     carries real speed. Once it drops below FLIGHT_V the spring is
     left alone to walk p back to zero, which is what lets an orb whose
     rest position has scrolled off screen settle there instead of
     grinding against an edge forever. */
  function step(o, dt) {
    o.vx += -o.k * o.px * dt;
    o.vy += -o.k * o.py * dt;

    var decay = Math.exp(-o.air * dt);
    o.vx *= decay;
    o.vy *= decay;

    o.px += o.vx * dt;
    o.py += o.vy * dt;

    var speed = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
    if (speed > FLIGHT_V) {
      var x = restX(o) + o.px, y = restY(o) + o.py;
      if (x < 0)          { o.px -= x;               o.vx = -o.vx * BOUNCE; o.vy *= WALL_FRICTION; }
      else if (x + o.w > vw) { o.px -= x + o.w - vw; o.vx = -o.vx * BOUNCE; o.vy *= WALL_FRICTION; }
      if (y < 0)          { o.py -= y;               o.vy = -o.vy * BOUNCE; o.vx *= WALL_FRICTION; }
      else if (y + o.h > vh) { o.py -= y + o.h - vh; o.vy = -o.vy * BOUNCE; o.vx *= WALL_FRICTION; }
    }

    if (speed < CALM_V && Math.abs(o.px) < CALM_P && Math.abs(o.py) < CALM_P) {
      var calm = Math.exp(-CALM_RATE * dt);
      o.px *= calm; o.py *= calm;
      o.vx *= calm; o.vy *= calm;
      speed *= calm;
    }

    if (speed < SLEEP_V && Math.abs(o.px) < SLEEP_P && Math.abs(o.py) < SLEEP_P) {
      o.px = 0; o.py = 0; o.vx = 0; o.vy = 0;
      o.asleep = true;
    }
  }

  /* ---- the one loop, for every orb ---- */
  function tick(now) {
    if (!running) return;
    var dt = lastT ? Math.min((now - lastT) / 1000, DT_MAX) : 0;
    lastT = now;

    scrollY = window.scrollY;
    var busy = false;

    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      if (!o.live) continue;
      if (!o.asleep && !o.held && dt > 0) step(o, dt);
      if (!o.asleep) busy = true;
      if (!o.asleep || dirty) draw(o);
    }

    dirty = false;

    if (!busy && !dragging) { running = false; lastT = 0; return; }
    requestAnimationFrame(tick);
  }

  function wake() {
    if (running || document.hidden) return;
    running = true;
    lastT = 0;
    requestAnimationFrame(tick);
  }

  /* ---- drag ----------------------------------------------------
     Pointer Events only: one code path for mouse, touch and pen.
     touch-action:none on .orb-live stops a drag from scrolling the
     page; touches anywhere else scroll normally. */

  /* ---- windowed velocity sampling ----
     Throw speed comes from a short trailing window, not the last frame
     delta. Samples older than SAMPLE_MS are dropped, including at the
     moment of release. That is what makes "drag fast, hold still, let
     go" drop the orb: holding still produces no new pointermove events,
     so by release every surviving sample has aged out and there is
     nothing left to derive a velocity from. */

  function pushSample(o, x, y, t) {
    var s = o.samples;
    s.push(x, y, t);                       /* flat triples, no per-move object churn */
    while (s.length > SAMPLE_MAX * 3) s.splice(0, 3);
    while (s.length && t - s[2] > SAMPLE_MS) s.splice(0, 3);
  }

  function throwVelocity(o, t) {
    var s = o.samples;
    while (s.length && t - s[2] > SAMPLE_MS) s.splice(0, 3);
    if (s.length < 6) return false;        /* need two live samples */
    var n = s.length;
    var dt = (s[n - 1] - s[2]) / 1000;
    if (dt <= 0) return false;
    var vx = (s[n - 3] - s[0]) / dt;
    var vy = (s[n - 2] - s[1]) / dt;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > THROW_MAX) { vx = vx / sp * THROW_MAX; vy = vy / sp * THROW_MAX; }
    o.vx = vx; o.vy = vy;
    return true;
  }

  function onDown(o, e) {
    if (o.held || !o.live) return;
    o.held = true;
    o.pid = e.pointerId;
    dragging++;
    o.asleep = false;
    o.vx = 0; o.vy = 0;                    /* grabbing kills existing motion */

    /* preserve where in the orb the pointer landed */
    o.gx = e.clientX - (restX(o) + o.px);
    o.gy = e.clientY - (restY(o) + o.py);

    o.samples.length = 0;
    pushSample(o, e.clientX, e.clientY, performance.now());

    o.el.classList.add("grabbed");
    try { o.el.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();                    /* no text-selection drag */
    wake();
  }

  function onMove(o, e) {
    if (!o.held || e.pointerId !== o.pid) return;
    o.px = e.clientX - o.gx - restX(o);
    o.py = e.clientY - o.gy - restY(o);
    pushSample(o, e.clientX, e.clientY, performance.now());
    wake();
  }

  /* cancelled === true for pointercancel: a system gesture took the
     pointer away, so release cleanly rather than leaving the orb stuck
     to a pointer that no longer exists. */
  function onUp(o, e, cancelled) {
    if (!o.held || e.pointerId !== o.pid) return;
    o.held = false;
    o.pid = -1;
    dragging--;
    o.el.classList.remove("grabbed");
    try { o.el.releasePointerCapture(e.pointerId); } catch (err) {}

    if (cancelled || !throwVelocity(o, performance.now())) { o.vx = 0; o.vy = 0; }
    o.samples.length = 0;
    wake();
  }

  function bind(o) {
    var el = o.el;
    el.addEventListener("pointerdown", function (e) { onDown(o, e); });
    el.addEventListener("pointermove", function (e) { onMove(o, e); }, { passive: true });
    el.addEventListener("pointerup", function (e) { onUp(o, e, false); }, { passive: true });
    el.addEventListener("pointercancel", function (e) { onUp(o, e, true); }, { passive: true });
  }

  /* ---- inputs ---- */
  window.addEventListener("scroll", function () {
    dirty = true;
    wake();
  }, { passive: true });

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 120);
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { running = false; lastT = 0; }
    else { dirty = true; wake(); }
  });

  build();
})();
