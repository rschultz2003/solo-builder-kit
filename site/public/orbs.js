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

  /* Hero orbs only. The capture-panel orbs stay authored in place, where
     .capture's own overflow:hidden clips them to the panel exactly as
     before — they were never part of the parallax and have no business
     flying around the page. */
  var anchors = [].slice.call(document.querySelectorAll(".hero-orbs .orb"));
  if (!anchors.length) return;

  /* The playfield is the first section, not the viewport. Orbs must not
     travel down into the content below it: as the hero scrolls away the
     floor rises with it, and once the hero is gone the orbs are gone. */
  var hero = document.querySelector(".hero");
  var heroBottomDoc = Infinity;
  var floorY = 0;            /* hero bottom in screen coords, this frame */

  var orbs = [];
  var layer = null;
  var vw = 0, vh = 0;
  var scrollY = 0;
  var running = false;
  var dirty = true;          /* transforms need rewriting (scroll/resize) */
  var lastT = 0;
  function anyOrbHeld() {
    for (var i = 0; i < orbs.length; i++) if (orbs[i].held) return true;
    return false;
  }

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

  /* float keyframe amplitude. The float lives on the skin, so the skin
     sits 0..FLOAT_MAX above the carrier the physics clamps. The top
     bound is inset by it so the sphere you can see never leaves the
     screen; the other three need no inset, since float only ever lifts. */
  var FLOAT_MAX = 16;

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

      /* Two elements, deliberately. The carrier takes the physics
         transform; the skin carries the paint and the float keyframes.
         Float has to survive as an input (Decision 1, and DESIGN.md
         names it in the signature), but a float term inside the composed
         transform would mean an orb is never still, so the rAF loop
         could never sleep. Splitting them keeps one authority per
         property per element: the compositor runs the float on the skin
         without waking the loop, and the loop owns the carrier alone. */
      var el = document.createElement("div");
      el.className = "orb-live";
      var skin = document.createElement("div");
      /* carry the visual classes (orb-a / orb-b / orb-c / orb-glass) across;
         geometry and opacity live on the anchor's #id rules, so copy the
         computed values onto the live orb instead of the selector */
      skin.className = a.className + " orb-skin floaty" +
                       (a.getAttribute("data-float") ? " " + a.getAttribute("data-float") : "");
      el.appendChild(skin);
      a.classList.add("orb-anchor");

      orbs.push({
        anchor: a,
        el: el,
        skin: skin,
        depth: parseFloat(a.getAttribute("data-depth")) || 0.15,
        ax: 0, ay: 0, w: 0, h: 0, rad: 0,
        px: 0, py: 0,          /* physics offset */
        vx: 0, vy: 0,          /* px per second */
        live: false,           /* anchor is laid out (not display:none) */
        asleep: true,
        flying: false,         /* carrying throw energy; only then do walls apply */
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
    heroBottomDoc = hero ? docPos(hero).y + hero.offsetHeight : Infinity;
    floorY = Math.max(0, Math.min(vh, heroBottomDoc - window.scrollY));
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      var w = o.anchor.offsetWidth, h = o.anchor.offsetHeight;
      o.live = w > 0 && h > 0;               /* #o3 is display:none <=860px */
      o.el.style.display = o.live ? "" : "none";
      /* a held orb that just stopped being laid out (resized past a
         breakpoint mid-drag) would otherwise stay held forever, and the
         loop skips non-live orbs so it could never release itself */
      if (!o.live && o.held) release(o, true);
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

    /* Walls apply only while the orb is still carrying throw energy, and
       that latch clears for good the first time it slows down. Gating on
       speed alone is not enough: if the rest position has scrolled off
       the top, the spring keeps re-accelerating the orb past any speed
       threshold, the wall keeps pushing it back, and the two grind
       against each other in a limit cycle that never sleeps. Once the
       throw is spent the spring is left alone to take the orb home, even
       when home is off screen. */
    if (o.flying && speed < FLIGHT_V) o.flying = false;

    if (o.flying) {
      var x = restX(o) + o.px, y = restY(o) + o.py;
      if (x < 0)          { o.px -= x;               o.vx = -o.vx * BOUNCE; o.vy *= WALL_FRICTION; }
      else if (x + o.w > vw) { o.px -= x + o.w - vw; o.vx = -o.vx * BOUNCE; o.vy *= WALL_FRICTION; }
      /* the floor is the hero's bottom edge, not the viewport's, so a
         thrown orb bounces back up instead of sailing into the content
         below. Skipped once the hero is too short to hold the orb,
         which is what lets it leave cleanly as the section scrolls off. */
      if (y < FLOAT_MAX)  { o.py += FLOAT_MAX - y;   o.vy = -o.vy * BOUNCE; o.vx *= WALL_FRICTION; }
      else if (floorY > o.h && y + o.h > floorY) {
        o.py -= y + o.h - floorY; o.vy = -o.vy * BOUNCE; o.vx *= WALL_FRICTION;
      }
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
      o.el.style.willChange = "";           /* holding a layer per orb costs GPU memory */
    }
  }

  /* ---- the one loop, for every orb ---- */
  function tick(now) {
    if (!running) return;
    var dt = lastT ? Math.min((now - lastT) / 1000, DT_MAX) : 0;
    lastT = now;

    scrollY = window.scrollY;

    /* clip the layer to the first section, so an orb is never painted
       over the content below it — the same containment .hero's
       overflow:hidden used to give, but without re-clipping the sides */
    floorY = heroBottomDoc - scrollY;
    if (floorY > vh) floorY = vh;
    if (floorY < 0) floorY = 0;
    layer.style.clipPath = "inset(0 0 " + (vh - floorY) + "px 0)";

    var busy = false;
    var anyHeld = false;

    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      if (!o.live) continue;
      if (o.held) anyHeld = true;
      if (!o.asleep && !o.held && dt > 0) step(o, dt);
      if (!o.asleep) busy = true;
      if (!o.asleep || dirty) draw(o);
    }

    dirty = false;

    /* derived from the orbs themselves, never a hand-kept counter: a
       single missed release would otherwise pin the loop on forever */
    if (!busy && !anyHeld) { running = false; lastT = 0; return; }
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
    o.asleep = false;
    o.vx = 0; o.vy = 0;                    /* grabbing kills existing motion */

    /* preserve where in the orb the pointer landed */
    o.gx = e.clientX - (restX(o) + o.px);
    o.gy = e.clientY - (restY(o) + o.py);

    o.samples.length = 0;
    pushSample(o, e.clientX, e.clientY, performance.now());

    o.el.classList.add("grabbed");
    o.el.style.willChange = "transform";    /* only while in play; cleared on sleep */
    try { o.el.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();                    /* no text-selection drag */
    wake();
  }

  function onMove(o, e) {
    if (!o.held || e.pointerId !== o.pid) return;
    /* keep the dragged orb inside the playfield, or it would disappear
       under the clip while still dutifully following the pointer */
    var x = e.clientX - o.gx, y = e.clientY - o.gy;
    var maxX = vw - o.w, maxY = floorY - o.h;
    if (x < 0) x = 0; else if (x > maxX) x = maxX;
    if (y < FLOAT_MAX) y = FLOAT_MAX; else if (maxY > FLOAT_MAX && y > maxY) y = maxY;
    o.px = x - restX(o);
    o.py = y - restY(o);
    pushSample(o, e.clientX, e.clientY, performance.now());
    wake();
  }

  /* cancelled === true for pointercancel, or for a forced release: a
     system gesture took the pointer away, so release cleanly rather than
     leaving the orb stuck to a pointer that no longer exists. */
  function release(o, cancelled) {
    var pid = o.pid;
    o.held = false;
    o.pid = -1;
    o.el.classList.remove("grabbed");
    o.el.classList.remove("hot");
    if (pid >= 0) { try { o.el.releasePointerCapture(pid); } catch (err) {} }

    if (cancelled || !throwVelocity(o, performance.now())) { o.vx = 0; o.vy = 0; }
    o.flying = Math.sqrt(o.vx * o.vx + o.vy * o.vy) > FLIGHT_V;
    o.samples.length = 0;
    wake();
  }

  function onUp(o, e, cancelled) {
    if (!o.held || e.pointerId !== o.pid) return;
    release(o, cancelled);
  }

  function bind(o) {
    var el = o.el;
    el.addEventListener("pointermove", function (e) { onMove(o, e); }, { passive: true });
    el.addEventListener("pointerup", function (e) { onUp(o, e, false); }, { passive: true });
    el.addEventListener("pointercancel", function (e) { onUp(o, e, true); }, { passive: true });
  }

  /* ---- deciding whether an orb may take the pointer ----------------
     Orbs paint above the page, and parallax sweeps them across every
     section as you scroll, so there is no resting position that is
     safe for the whole scroll range: an orb will sit over a link, a
     button or a line of text at some offset. Placement alone cannot
     satisfy "orbs never block a link, button or text selection".

     So orbs are pointer-events:none by default and the decision is
     made per pointerdown. The event lands on whatever is genuinely
     underneath; an orb only claims it when that spot is inert. An orb
     over a paragraph's empty right-hand gutter is still grabbable,
     because the test uses the text's own line boxes rather than the
     block's full width. */

  var INTERACTIVE = "a,button,input,select,textarea,label,summary,[role=button],[contenteditable]";

  function overText(el, x, y) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
      var range = document.createRange();
      range.selectNodeContents(n);
      var rects = range.getClientRects();
      for (var j = 0; j < rects.length; j++) {
        var r = rects[j];
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
      }
    }
    return false;
  }

  function spotIsClaimed(x, y) {
    var el = document.elementFromPoint(x, y);
    if (!el) return false;
    if (el.closest && el.closest(INTERACTIVE)) return true;
    return overText(el, x, y);
  }

  /* circle test, not the bounding box, so the corners of a sphere's box
     never swallow a pointer that visually missed the orb */
  function orbAt(x, y) {
    scrollY = window.scrollY;
    for (var i = orbs.length - 1; i >= 0; i--) {
      var o = orbs[i];
      if (!o.live) continue;
      /* cheap reject first. The carrier does not know about the float
         bob, so widen by the keyframe amplitude before paying for a
         layout read; most pointer positions never get past this. */
      var dx = x - (restX(o) + o.px + o.rad);
      var dy = y - (restY(o) + o.py + o.rad);
      var slack = o.rad + FLOAT_MAX;
      if (dx * dx + dy * dy > slack * slack) continue;
      /* exact: the skin is where the orb is actually painted */
      var r = o.skin.getBoundingClientRect();
      var ex = x - (r.left + r.width / 2);
      var ey = y - (r.top + r.height / 2);
      if (ex * ex + ey * ey <= o.rad * o.rad) return o;
    }
    return null;
  }

  function grabbable(x, y) {
    var o = orbAt(x, y);
    return (o && !spotIsClaimed(x, y)) ? o : null;
  }

  document.addEventListener("pointerdown", function (e) {
    if (e.button > 0) return;
    var o = grabbable(e.clientX, e.clientY);
    if (o) onDown(o, e);
  }, true);

  /* Touch devices need this or a drag never survives.
     touch-action is only consulted on the hit-test target, and an element with
     pointer-events:none is never the hit-test target. So the touch-action:none
     on .orb-live never applied: at the moment iOS arbitrated the gesture the
     target was the page, Safari started a pan, and a pan cancels the pointer.
     Measured on an iPhone before this: 8 of 9 orb drags cancelled, most inside
     100ms. Preventing the default on touchstart stops the pan before it starts,
     and keeps pointer-events:none so links and text still win the tap. */
  document.addEventListener("touchstart", function (e) {
    if (anyOrbHeld()) { e.preventDefault(); return; }
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    if (grabbable(t.clientX, t.clientY)) e.preventDefault();
  }, { passive: false });

  /* cursor affordance only where a pointer can actually hover */
  if (window.matchMedia("(hover: hover)").matches) {
    var hot = null;
    document.addEventListener("pointermove", function (e) {
      if (anyOrbHeld()) return;
      var o = grabbable(e.clientX, e.clientY);
      if (o === hot) return;
      if (hot) hot.el.classList.remove("hot");
      hot = o;
      if (hot) hot.el.classList.add("hot");
    }, { passive: true });
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

  /* Anchors deep in the page sit below a lot of text, so their document
     position shifts when the webfonts swap in. build() runs on defer,
     before that happens. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
