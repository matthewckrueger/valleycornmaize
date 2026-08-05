// Tames oversized mouse-wheel jumps (common with high-speed/free-spin wheel
// mice) by clamping each wheel tick and easing toward the target position.
// Touch scrolling on phones/tablets is untouched — wheel events don't fire
// on touch input, so this only affects desktop mouse users.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var targetY = window.pageYOffset;
  var animating = false;
  var MAX_STEP = 90; // clamp a single wheel tick to at most this many px
  var EASE = 0.15;   // how quickly we chase the target each frame (0-1)

  function clampToDocument(y) {
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(maxScroll, y));
  }

  function onWheel(e) {
    if (e.ctrlKey || e.metaKey) return; // let pinch-zoom / cmd+scroll behave natively

    var delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 18; // "line" mode -> approx px
    else if (e.deltaMode === 2) delta *= window.innerHeight; // "page" mode

    delta = Math.max(-MAX_STEP, Math.min(MAX_STEP, delta));

    e.preventDefault();
    targetY = clampToDocument(targetY + delta);

    if (!animating) {
      animating = true;
      requestAnimationFrame(step);
    }
  }

  function step() {
    var current = window.pageYOffset;
    var diff = targetY - current;

    if (Math.abs(diff) < 0.5) {
      window.scrollTo({ top: targetY, left: 0, behavior: "auto" });
      animating = false;
      return;
    }

    window.scrollTo({ top: current + diff * EASE, left: 0, behavior: "auto" });
    requestAnimationFrame(step);
  }

  window.addEventListener("scroll", function () {
    if (!animating) targetY = window.pageYOffset;
  }, { passive: true });

  window.addEventListener("wheel", onWheel, { passive: false });
})();
