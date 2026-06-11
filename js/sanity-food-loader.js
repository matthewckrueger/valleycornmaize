document.addEventListener("DOMContentLoaded", async function () {
  const foodGrid = document.getElementById("foodMenuGrid");

  if (!foodGrid) return;

  const projectId = "f8kcv61e";
  const dataset = "production";

const query = encodeURIComponent(`
  *[_type == "foodItem" && active == true] | order(sortOrder asc) {
    name,
    description,
    price,
    featured,
    icon,
    "imageUrl": image.asset->url
  }
`);

  const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.result || !Array.isArray(data.result)) return;

    foodGrid.innerHTML = "";

    data.result.forEach(function (item) {
      const card = document.createElement("div");
      card.className = "food-card";

      const imageHtml = item.imageUrl
        ? `<img src="${item.imageUrl}" alt="${item.name || "Food item"}" class="food-card-photo">`
        : `<i class="${item.icon || "fa-solid fa-utensils"}"></i>`;

card.innerHTML = `
  <div class="food-card-img ${item.imageUrl ? "has-food-photo" : ""}">
    ${item.featured ? `<div class="food-featured-badge">FEATURED</div>` : ""}
    ${imageHtml}
  </div>

  <div class="food-card-body">
    <div class="food-card-name">${item.name || ""}</div>
    <div class="food-card-desc">${item.description || ""}</div>

    ${
      item.price
        ? `<div class="food-card-price">${item.price}</div>`
        : ""
    }
  </div>
`;

      foodGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Could not load Sanity food items:", error);
  }
});
