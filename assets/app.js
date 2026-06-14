const kickoff = new Date(document.documentElement.dataset.kickoff || "2026-06-11T19:00:00-05:00");

function updateCountdown() {
  const target = document.querySelector("[data-countdown]");
  if (!target) return;

  const diff = Math.max(0, kickoff.getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const values = { days, hours, minutes, seconds };

  target.querySelectorAll("[data-unit]").forEach((node) => {
    const unit = node.dataset.unit;
    node.textContent = String(values[unit]).padStart(unit === "days" ? 1 : 2, "0");
  });
}

function setupMenu() {
  const button = document.querySelector("[data-menu-button]");
  if (!button) return;
  button.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
}

function setupTeamSearch() {
  const input = document.querySelector("[data-team-search]");
  if (!input) return;

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    document.querySelectorAll("[data-team-card]").forEach((card) => {
      const haystack = card.dataset.teamCard.toLowerCase();
      card.hidden = query.length > 0 && !haystack.includes(query);
    });
  });
}

function setupTimezone() {
  const select = document.querySelector("[data-timezone]");
  const output = document.querySelector("[data-timezone-output]");
  if (!select || !output) return;

  const render = () => {
    const zone = select.value;
    const formatter = new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: zone
    });

    output.innerHTML = "";
    document.querySelectorAll("[data-match-start]").forEach((node) => {
      const row = document.createElement("li");
      row.textContent = `${node.dataset.matchLabel}: ${formatter.format(new Date(node.dataset.matchStart))}`;
      output.append(row);
    });
  };

  select.addEventListener("change", render);
  render();
}

function setupIcsDownload() {
  const button = document.querySelector("[data-ics]");
  if (!button) return;

  button.addEventListener("click", () => {
    const events = Array.from(document.querySelectorAll("[data-match-start]")).map((node) => {
      const start = new Date(node.dataset.matchStart);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const stamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      return [
        "BEGIN:VEVENT",
        `UID:${node.dataset.matchId}@cupcalendar.xyz`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${node.dataset.matchLabel}`,
        `LOCATION:${node.dataset.matchVenue}`,
        "END:VEVENT"
      ].join("\r\n");
    });

    const calendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CupCalendar//2026 World Cup//EN",
      ...events,
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cupcalendar-2026-world-cup.ics";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
}

updateCountdown();
setInterval(updateCountdown, 1000);
setupMenu();
setupTeamSearch();
setupTimezone();
setupIcsDownload();
