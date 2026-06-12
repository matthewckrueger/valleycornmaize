document.addEventListener("DOMContentLoaded", async function () {
  const faqList = document.getElementById("faqList");
  if (!faqList) return;

  const projectId = "f8kcv61e";
  const dataset = "production";

  const query = encodeURIComponent(`
    *[_type == "faq" && active == true] | order(sortOrder asc) {
      question,
      answer
    }
  `);

  const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.result || !Array.isArray(data.result)) return;

    faqList.innerHTML = "";

    data.result.forEach(function (faq) {
      const item = document.createElement("div");
      item.className = "faq-item";

      item.innerHTML = `
        <button class="faq-question" type="button">
          <span>${faq.question || ""}</span>
          <span class="faq-icon">+</span>
        </button>
        <div class="faq-answer">${faq.answer || ""}</div>
      `;

      item.querySelector(".faq-question").addEventListener("click", function () {
        item.classList.toggle("open");
        item.querySelector(".faq-icon").textContent = item.classList.contains("open") ? "–" : "+";
      });

      faqList.appendChild(item);
    });
  } catch (error) {
    console.error("Could not load Sanity FAQs:", error);
  }
});
