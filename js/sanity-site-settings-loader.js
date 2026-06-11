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

    if (settings.alertEnabled) {
      const alertBar = document.createElement("div");
      alertBar.className = `site-alert site-alert-${settings.alertType || "notice"}`;
const alertContent = `
  <span class="site-alert-icon">!</span>
  <span>${settings.alertMessage || "Important update from Valley Corn Maize."}</span>
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
      `;

      const nav = document.querySelector("nav");
      if (nav) {
        nav.insertAdjacentElement("afterend", alertBar);
        document.body.classList.add("has-site-alert");
      }
    }
  } catch (error) {
    console.error("Could not load Sanity site settings:", error);
  }
});
