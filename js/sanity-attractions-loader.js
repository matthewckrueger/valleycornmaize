document.addEventListener("DOMContentLoaded", async function () {
  const attractionsGrid = document.getElementById("attractionsGrid");

  if (!attractionsGrid) return;

  const projectId = "f8kcv61e";
  const dataset = "production";

  const query = encodeURIComponent(`
    *[_type == "attraction"] | order(_createdAt asc) {
      title,
      description,
      icon
    }
  `);

  const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.result || !Array.isArray(data.result)) return;

    attractionsGrid.innerHTML = "";

    data.result.forEach(function (attraction) {
      const card = document.createElement("div");
      card.className = "a-card";

      card.innerHTML = `
        <div class="a-photo">
          <div class="photo-slot">
            <i class="${attraction.icon || "fa-solid fa-seedling"}"></i>
            <span class="slot-label">PHOTO COMING SOON</span>
          </div>
        </div>
        <div class="a-info">
          <h3>${attraction.title || ""}</h3>
          <p>${attraction.description || ""}</p>
        </div>
      `;

      attractionsGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Could not load Sanity attractions:", error);
  }
});
