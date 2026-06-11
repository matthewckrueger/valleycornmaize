document.addEventListener("DOMContentLoaded", async function () {
  const projectId = "f8kcv61e";
  const dataset = "production";

  const query = encodeURIComponent(`
    *[_type == "siteSettings"][0] {
      alertEnabled,
      alertMessage,
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
      alertBar.className = "site-alert";
      alertBar.innerHTML = `
        <div class="site-alert-inner">
          <span class="site-alert-icon">!</span>
          <span>${settings.alertMessage || "Important update from Valley Corn Maize."}</span>
        </div>
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
