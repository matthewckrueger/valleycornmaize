// Automatically hides the Sunflower Dayz ticket card once the event has passed.
// Expiry date lives on the card itself via data-expires, so it can be updated
// in index.html without touching this file.
document.addEventListener("DOMContentLoaded", function () {
  var card = document.getElementById("sunflower-dayz-card");
  if (!card) return;

  var expiresAt = card.getAttribute("data-expires");
  if (!expiresAt) return;

  var cutoff = new Date(expiresAt);
  if (isNaN(cutoff.getTime())) return;

  if (new Date() >= cutoff) {
    var grid = card.closest(".ticket-grid");
    card.remove();
    if (grid) {
      grid.classList.add("two-cards");
    }
  }
});
