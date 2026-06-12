document.addEventListener("DOMContentLoaded", async function () {
  const eventsGrid = document.getElementById("eventsGrid");

  if (!eventsGrid) return;

  const projectId = "f8kcv61e";
  const dataset = "production";

  const today = new Date().toISOString().split("T")[0];

  function formatCalendarDate(dateStr) {
  return dateStr.replaceAll("-", "");
}

function buildGoogleCalendarLink(event) {
  const title = encodeURIComponent(event.title || "Valley Corn Maize Event");
  const details = encodeURIComponent(event.description || "");
  const location = encodeURIComponent("Valley Corn Maize, 42969 160th Street SW, East Grand Forks, MN 56721");

  const start = formatCalendarDate(event.eventDate);
  const endDate = new Date(event.eventDate);
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.toISOString().split("T")[0].replaceAll("-", "");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

function buildIcsLink(event) {
  const start = formatCalendarDate(event.eventDate);

  const endDate = new Date(event.eventDate);
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.toISOString().split("T")[0].replaceAll("-", "");

  const title = event.title || "Valley Corn Maize Event";
  const description = event.description || "";
  const location = "Valley Corn Maize, 42969 160th Street SW, East Grand Forks, MN 56721";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `SUMMARY:${title}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\n");

  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}

const query = encodeURIComponent(`
  *[
    _type == "event" &&
    (
      !defined(hideAfterEvent) ||
      hideAfterEvent != true ||
      !defined(eventDate) ||
      eventDate >= "${today}"
    )
  ] | order(eventDate asc) {
    title,
    date,
    eventDate,
    description,
    "imageUrl": image.asset->url
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

      const imageHtml = event.imageUrl
        ? `<img src="${event.imageUrl}" alt="${event.title || "Event"}" class="ev-card-img">`
        : `<div class="ev-fallback"><i class="fa-solid fa-calendar-days"></i></div>`;

      card.innerHTML = `
        <div class="ev-top ${event.imageUrl ? "ev-top-image" : "ev-top-fallback"}">
          ${imageHtml}
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
