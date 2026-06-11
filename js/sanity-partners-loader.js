document.addEventListener("DOMContentLoaded", async function () {
  const partnerGrid = document.getElementById("partnerGrid");

  if (!partnerGrid) return;

  const projectId = "f8kcv61e";
  const dataset = "production";

  const query = encodeURIComponent(`
    *[_type == "partner" && active == true] | order(_createdAt asc) {
      name,
      website,
      "logoUrl": logo.asset->url
    }
  `);

  const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.result || !Array.isArray(data.result)) return;

    partnerGrid.innerHTML = "";

    data.result.forEach(function (partner) {
      const link = document.createElement("a");
      link.className = "partner-tile";
      link.href = partner.website || "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      link.innerHTML = partner.logoUrl
        ? `<img src="${partner.logoUrl}" alt="${partner.name || "Partner"}">`
        : `<span class="partner-tile-text">${partner.name || "Partner"}</span>`;

      partnerGrid.appendChild(link);
    });
  } catch (error) {
    console.error("Could not load Sanity partners:", error);
  }
});
