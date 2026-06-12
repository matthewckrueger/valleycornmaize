document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", function (e) {
    const targetId = this.getAttribute("href");

    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);
    if (!target) return;

    e.preventDefault();

    const navHeight = document.querySelector("nav")?.offsetHeight || 72;
    const alertHeight = document.querySelector(".site-alert")?.offsetHeight || 0;

    const targetPosition =
      target.getBoundingClientRect().top +
      window.pageYOffset -
      navHeight -
      alertHeight -
      20;

    smoothScrollTo(targetPosition, 500); // milliseconds
  });
});

function smoothScrollTo(targetY, duration) {
  const startY = window.pageYOffset;
  const distance = targetY - startY;
  let startTime = null;

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animation(currentTime) {
    if (!startTime) startTime = currentTime;

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    window.scrollTo(
      0,
      startY + distance * easeInOutCubic(progress)
    );

    if (progress < 1) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}
