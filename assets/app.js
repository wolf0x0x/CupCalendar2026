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

// 问题 2 修复：为多语言切换按钮绑定 H5 弹窗或下拉逻辑，智能提取当前路由并完成语种跨目录平滑跳转
function setupLanguageSwitcher() {
  const langBtn = document.querySelector(".nav-actions .icon-btn[title='Language']");
  if (!langBtn) return;

  langBtn.addEventListener("click", () => {
    const currentPath = window.location.pathname;
    const languages = [
      { code: "en", label: "English" },
      { code: "zh", label: "中文" },
      { code: "es", label: "Español" },
      { code: "pt", label: "Português" },
      { code: "fr", label: "Français" },
      { code: "de", label: "Deutsch" },
      { code: "ja", label: "日本語" }
    ];

    // 构建一个优雅的 H5 弹窗选择器
    const overlay = document.createElement("div");
    overlay.style = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);";

    const dialog = document.createElement("div");
    dialog.style = "background:#fff;width:100%;max-width:320px;border-radius:12px;padding:24px;box-shadow:0 20px 40px rgba(0,0,0,0.3);";

    let listHtml = `<h3 style="margin:0 0 16px 0;font-family:Inter,sans-serif;color:#003478;">Select Language</h3>`;
    languages.forEach(lang => {
      listHtml += `<button data-lang="${lang.code}" style="width:100%;padding:12px;margin:4px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-weight:bold;cursor:pointer;text-align:left;">${lang.label}</button>`;
    });

    dialog.innerHTML = listHtml;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 监听关闭与跳转
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    dialog.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetLang = btn.dataset.lang;
        // 动态替换路径中的语言前缀：/2026/old_lang/path -> /2026/target_lang/path
        const pathSegments = currentPath.split("/");
        if (pathSegments[1] === "2026" && pathSegments[2]) {
          pathSegments[2] = targetLang;
          window.location.href = pathSegments.join("/");
        } else {
          window.location.href = `/2026/${targetLang}/`;
        }
        overlay.remove();
      });
    });
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
      row.style = "padding:10px; border-bottom:1px solid #e2e8f0; list-style:none;";
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
setupLanguageSwitcher();
setupTeamSearch();
setupTimezone();
setupIcsDownload();
