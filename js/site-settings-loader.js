document.addEventListener("DOMContentLoaded", function () {
  if (typeof siteSettings === "undefined") {
    console.warn("siteSettings not found.");
    return;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
      el.textContent = value;
    }
  }

  // Site-wide alert banner
  if (siteSettings.alert && siteSettings.alert.enabled) {
    const alertBar = document.createElement("div");
    alertBar.className = "site-alert";
    alertBar.innerHTML = `
      <div class="site-alert-inner">
        <span class="site-alert-icon">!</span>
        <span>${siteSettings.alert.message}</span>
      </div>
    `;

    const nav = document.querySelector("nav");
    if (nav) {
      nav.insertAdjacentElement("afterend", alertBar);
      document.body.classList.add("has-site-alert");
    }
  }

  // Quick info strip
  if (siteSettings.season) {
    setText("seasonLabel", siteSettings.season.label);
    setText("seasonValue", siteSettings.season.value);
    setText("seasonSubtext", siteSettings.season.subtext);
  }

  if (siteSettings.hours) {
    setText("hoursLabel", siteSettings.hours.label);
    setText("hoursSaturday", siteSettings.hours.saturday);
    setText("hoursSunday", siteSettings.hours.sunday);
  }

  if (siteSettings.admission) {
    setText("admissionLabel", siteSettings.admission.label);
    setText("admissionValue", siteSettings.admission.value);
    setText("admissionSubtext", siteSettings.admission.subtext);
  }

  if (siteSettings.location) {
    setText("locationLabel", siteSettings.location.label);
    setText("locationValue", siteSettings.location.value);
    setText("locationSubtext", siteSettings.location.subtext);
  }

  // Ticket links
  if (siteSettings.ticketLink) {
    document.querySelectorAll('a[href="#tickets"]').forEach(function (link) {
      link.setAttribute("href", siteSettings.ticketLink);
    });
  }
  // Events
if (Array.isArray(eventsData)) {
  const eventsGrid = document.getElementById("eventsGrid");

  if (eventsGrid) {
    eventsGrid.innerHTML = "";

    eventsData.forEach(function (event) {
      const card = document.createElement("div");
      card.className = "ev-card";

      card.innerHTML = `
        <div class="ev-top" style="background: linear-gradient(135deg, var(--green), var(--dkgreen));">
          <i class="${event.icon || "fa-solid fa-calendar-days"}"></i>
        </div>
        <div class="ev-body">
          <span class="ev-when">${event.date}</span>
          <div class="ev-name">${event.name}</div>
          <p class="ev-desc">${event.description}</p>
        </div>
      `;

      eventsGrid.appendChild(card);
    });
  }
}
  // Attractions
if (typeof attractionsData !== "undefined" && Array.isArray(attractionsData)) {
  const attractionsGrid = document.getElementById("attractionsGrid");

  if (attractionsGrid) {
    attractionsGrid.innerHTML = "";

    attractionsData.forEach(function (attraction) {
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
          <h3>${attraction.title}</h3>
          <p>${attraction.description}</p>
        </div>
      `;

      attractionsGrid.appendChild(card);
    });
  }
}
  // Tickets
if (typeof ticketsData !== "undefined" && ticketsData) {
  function setTicketText(selector, value) {
    const el = document.querySelector(selector);
    if (el && value !== undefined && value !== null) {
      el.textContent = value;
    }
  }

  function setTicketLink(selector, value) {
    const el = document.querySelector(selector);
    if (el && value) {
      el.setAttribute("href", value);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");;
    }
  }

  if (ticketsData.dayPass) {
    setTicketText("[data-ticket='day-type']", ticketsData.dayPass.type);
    setTicketText("[data-ticket='day-price']", ticketsData.dayPass.price);
    setTicketText("[data-ticket='day-desc']", ticketsData.dayPass.description);
    setTicketText("[data-ticket='day-button']", ticketsData.dayPass.buttonText);
    setTicketLink("[data-ticket='day-button']", ticketsData.dayPass.buttonLink);
  }

  if (ticketsData.seasonPass) {
    setTicketText("[data-ticket='season-type']", ticketsData.seasonPass.type);
    setTicketText("[data-ticket='season-price']", ticketsData.seasonPass.price);
    setTicketText("[data-ticket='season-desc']", ticketsData.seasonPass.description);
    setTicketText("[data-ticket='season-button']", ticketsData.seasonPass.buttonText);
    setTicketLink("[data-ticket='season-button']", ticketsData.seasonPass.buttonLink);
  }
}
  // Ticket links only
if (typeof ticketsData !== "undefined" && ticketsData) {
  function setTicketLink(selector, value) {
    const el = document.querySelector(selector);
    if (el && value) {
      el.setAttribute("href", value);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  }

  if (ticketsData.dayPass) {
    setTicketLink("[data-ticket='day-button']", ticketsData.dayPass.buttonLink);
  }

  if (ticketsData.seasonPass) {
    setTicketLink("[data-ticket='season-button']", ticketsData.seasonPass.buttonLink);
  }
}
});
