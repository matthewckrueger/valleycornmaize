document.addEventListener("DOMContentLoaded", async function () {
  const projectId = "f8kcv61e";
  const dataset = "production";
  const CACHE_KEY = "vcm_site_settings";

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

  function formatHours(value) {
    return (value || "")
      .replaceAll(":00", "")
      .replaceAll(" AM", "am")
      .replaceAll(" PM", "pm");
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value && value.trim() !== "") {
      el.textContent = value;
    }
  }

  function renderAlertBanner(settings) {
    const existing = document.querySelector(".site-alert");
    if (existing) existing.remove();
    document.body.classList.remove("has-site-alert");

    if (!settings || !settings.alertEnabled || !settings.alertMessage?.trim()) return;

    const alertBar = document.createElement("div");
    alertBar.className = `site-alert site-alert-${settings.alertType || "notice"}`;

    const alertContent = `
      <span class="site-alert-icon">!</span>
      <span>${settings.alertMessage}</span>
    `;

    alertBar.innerHTML = settings.alertLink
      ? `<a class="site-alert-inner site-alert-link"
            href="${settings.alertLink}"
            target="_blank"
            rel="noopener noreferrer">
           ${alertContent}
         </a>`
      : `<div class="site-alert-inner">
           ${alertContent}
         </div>`;

    const nav = document.querySelector("nav");
    if (nav) {
      nav.insertAdjacentElement("afterend", alertBar);
      document.body.classList.add("has-site-alert");
    }
  }

  function applyDynamicSettings(settings) {
    if (!settings) return;

    const saturdayHours = formatHours(settings.saturdayHours);
    const sundayHours = formatHours(settings.sundayHours);

    setText("seasonValue", settings.seasonValue);

    const sat = document.getElementById("hoursSaturday");
    if (sat) sat.innerHTML = `<strong>${saturdayHours}</strong> | Saturday`;

    const sun = document.getElementById("hoursSunday");
    if (sun) sun.innerHTML = `<strong>${sundayHours}</strong> | Sunday`;

    setText("admissionValue", settings.admission);
    setText("heroSeasonValue", settings.seasonValue);

    if (saturdayHours || sundayHours) {
      setText("heroHoursValue", `Sat ${saturdayHours} · Sun ${sundayHours}`);
    }

    setText("heroAdmissionValue", settings.admission);

    if (settings.ticketLink) {
      document
        .querySelectorAll('a[href="#tickets"], [data-ticket="day-button"], [data-ticket="season-button"]')
        .forEach(function (link) {
          link.setAttribute("href", settings.ticketLink);
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        });
    }
  }

  // Show immediately from cache so the banner is visible before the network completes
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { settings } = JSON.parse(cached);
      renderAlertBanner(settings);
      applyDynamicSettings(settings);
    }
  } catch (e) {
    // ignore bad cache
  }

  // Fetch fresh from Sanity and update
  try {
    const response = await fetch(url);
    const data = await response.json();
    const settings = data.result;

    if (!settings) return;

    // Persist so next page load renders instantly
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ settings }));
    } catch (e) {
      // ignore storage errors (private browsing, full)
    }

    // Re-render — replaces cached version if content changed
    renderAlertBanner(settings);
    applyDynamicSettings(settings);
  } catch (error) {
    console.error("Could not load Sanity site settings:", error);
  }
});
