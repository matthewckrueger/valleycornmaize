document.addEventListener("DOMContentLoaded", async function () {
  const eventsGrid = document.getElementById("eventsGrid");

  if (!eventsGrid) return;

  const projectId = "f8kcv61e";
  const dataset = "production";

  const query = encodeURIComponent(`
    *[_type == "event"] | order(_createdAt asc) {
      title,
      date,
      description
    }
  `);

  const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.result || !Array.isArray(data.result)) return;

    eventsGrid.innerHTML = "";

    data.result.forEach(function (event) {
      const card = document.createElement("div");
      card.className = "ev-card";

      card.innerHTML = `
        <div class="ev-top" style="background: linear-gradient(135deg, var(--green), var(--dkgreen));">
          <i class="fa-solid fa-calendar-days"></i>
        </div>
        <div class="ev-body">
          <span class="ev-when">${event.date || ""}</span>
          <div class="ev-name">${event.title || ""}</div>
          <p class="ev-desc">${event.description || ""}</p>
        </div>
      `;

      eventsGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Could not load Sanity events:", error);
  }
});
