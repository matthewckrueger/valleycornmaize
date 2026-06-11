document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener("click", function (e) {
    const targetId = this.getAttribute("href");

    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);
    if (!target) return;

    e.preventDefault();

    const navHeight = document.querySelector("nav")?.offsetHeight || 72;
    const alertHeight = document.querySelector(".site-alert")?.offsetHeight || 0;
    const extraPadding = 18;

    const targetPosition =
      target.getBoundingClientRect().top +
      window.pageYOffset -
      navHeight -
      alertHeight -
      extraPadding;

    window.scrollTo({
      top: targetPosition,
      behavior: "smooth"
    });
  });
});
