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

  var DT_MAX = 0.032;        /* clamp so a backgrounded tab cannot teleport orbs */

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
        asleep: true
      });
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
      if (!o.asleep) busy = true;
      if (!o.asleep || dirty) draw(o);
    }

    dirty = false;

    if (!busy) { running = false; lastT = 0; return; }
    requestAnimationFrame(tick);
  }

  function wake() {
    if (running || document.hidden) return;
    running = true;
    lastT = 0;
    requestAnimationFrame(tick);
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
