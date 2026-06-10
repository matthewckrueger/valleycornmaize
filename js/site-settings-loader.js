document.addEventListener("DOMContentLoaded", function () {
  if (typeof siteSettings === "undefined") {
    console.warn("siteSettings not found.");
    return;
  }

  // Site-wide alert banner
  if (siteSettings.alert && siteSettings.alert.enabled) {
    const alertBar = document.createElement("div");
    alertBar.className = "site-alert";
    alertBar.innerHTML = `
      <div class="site-alert-inner">
        <span class="site-alert-icon">!</span>
        <span>${siteSettings.alert.message}</span>
      </div>
    `;

    const nav = document.querySelector("nav");
    if (nav) {
      nav.insertAdjacentElement("afterend", alertBar);
      document.body.classList.add("has-site-alert");
    }
  }
});
