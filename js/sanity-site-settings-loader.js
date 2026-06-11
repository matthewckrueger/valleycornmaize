document.addEventListener("DOMContentLoaded", async function () {
  const projectId = "f8kcv61e";
  const dataset = "production";

  const query = encodeURIComponent(`
    *[_type == "siteSettings"][0] {
      alertEnabled,
      alertType,
      alertMessage,
      alertLink,
      seasonValue,
      saturdayHours,
      sundayHours,
      admission,
      ticketLink
    }
  `);

  const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const settings = data.result;

    if (!settings) return;

    // Alert banner from Sanity
    if (settings.alertEnabled && settings.alertMessage?.trim()) {
      const alertBar = document.createElement("div");
      alertBar.className = `site-alert site-alert-${settings.alertType || "notice"}`;

      const alertContent = `
        <span class="site-alert-icon">!</span>
        <span>${settings.alertMessage}</span>
      `;

      alertBar.innerHTML = settings.alertLink
        ? `
          <a class="site-alert-inner site-alert-link"
             href="${settings.alertLink}"
             target="_blank"
             rel="noopener noreferrer">
            ${alertContent}
          </a>
        `
        : `
          <div class="site-alert-inner">
            ${alertContent}
          </div>
        `;

      const nav = document.querySelector("nav");

      if (nav) {
        nav.insertAdjacentElement("afterend", alertBar);
        document.body.classList.add("has-site-alert");
      }
    }

    function setText(id, value) {
      const el = document.getElementById(id);
      if (el && value && value.trim() !== "") {
        el.textContent = value;
      }
    }

    // Quick info strip from Sanity
    setText("seasonValue", settings.seasonValue);
    setText(
  "hoursSaturday",
  `Saturday | ${settings.saturdayHours || ""}`
);

setText(
  "hoursSunday",
  `Sunday | ${settings.sundayHours || ""}`
);
    setText("admissionValue", settings.admission);
    setText("heroSeasonValue", settings.seasonValue);

if (settings.saturdayHours || settings.sundayHours) {
  setText(
  "heroHoursValue",
  `Sat ${settings.saturdayHours || ""} · Sun ${settings.sundayHours || ""}`
);
}

setText("heroAdmissionValue", settings.admission);

    // Ticket links from Sanity
    if (settings.ticketLink) {
      document
        .querySelectorAll('a[href="#tickets"], [data-ticket="day-button"], [data-ticket="season-button"]')
        .forEach(function (link) {
          link.setAttribute("href", settings.ticketLink);
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        });
    }
  } catch (error) {
    console.error("Could not load Sanity site settings:", error);
  }
});
