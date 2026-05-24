const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyMn5EHC2nSKN7nYKz_y-HSAz8s2WNnyHG5WlfXWqGS4N0EiLQralSz5L5-svmURlTxYg/exec";

document.addEventListener("DOMContentLoaded", () => {
  refreshOpenPanels();
  loadResults();

  window.addEventListener("resize", () => {
    refreshOpenPanels();
  });
});

async function loadResults() {
  const tbody = document.getElementById("resultsBody");

  if (!tbody) {
    console.error("Не найден элемент #resultsBody");
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="loading-row">Загрузка результатов...</td>
    </tr>
  `;

  refreshOpenPanels();

  try {
    const results = await loadResultsJsonp();

    if (!Array.isArray(results) || results.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="loading-row">Пока нет результатов</td>
        </tr>
      `;

      updateParticipantsCount(0);
      refreshOpenPanels();
      return;
    }

    const sortedResults = results
      .filter(user => {
        if (!user.name) return false;
        if (user.score === null || user.score === undefined) return false;
        if (isNaN(Number(user.score))) return false;

        return true;
      })
      .sort((a, b) => Number(b.score) - Number(a.score));

    renderResults(sortedResults);
    updateParticipantsCount(sortedResults.length);
    refreshOpenPanels();

  } catch (error) {
    console.error("Ошибка загрузки результатов:", error);

    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="loading-row error-row">
          Не удалось загрузить результаты
        </td>
      </tr>
    `;

    updateParticipantsCount("Ошибка");
    refreshOpenPanels();
  }
}

function loadResultsJsonp() {
  return new Promise((resolve, reject) => {
    const callbackName = "promotakeResultsCallback_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    const separator = GOOGLE_SCRIPT_URL.includes("?") ? "&" : "?";
    const url = GOOGLE_SCRIPT_URL + separator + "callback=" + callbackName + "&t=" + Date.now();

    const script = document.createElement("script");

    const timeout = setTimeout(() => {
      delete window[callbackName];
      script.remove();
      reject(new Error("Превышено время ожидания ответа"));
    }, 15000);

    window[callbackName] = function(data) {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.onerror = function() {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      reject(new Error("Ошибка JSONP-запроса"));
    };

    script.src = url;
    document.body.appendChild(script);
  });
}

function renderResults(results) {
  const tbody = document.getElementById("resultsBody");

  tbody.innerHTML = results.map((user, index) => {
    const place = index + 1;
    const medal = getMedal(place);

    return `
      <tr>
        <td class="place">${medal} #${place}</td>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.gameNick || "—")}</td>
        <td class="score">${Number(user.score)} / ${Number(user.max || 100)}</td>
      </tr>
    `;
  }).join("");
}

function getMedal(place) {
  if (place === 1) return "🥇";
  if (place === 2) return "🥈";
  if (place === 3) return "🥉";
  return "";
}

function updateParticipantsCount(count) {
  const status = document.querySelector(".exam-card .status");

  if (!status) {
    return;
  }

  if (count === "Ошибка") {
    status.textContent = "Ошибка";
    return;
  }

  status.textContent = `${count} участников`;
}

function toggleCard(button) {
  const card = button.closest(".result-card");

  if (!card || card.classList.contains("empty-card")) {
    return;
  }

  const panel = card.querySelector(".panel");

  if (!panel) {
    return;
  }

  const isOpen = card.classList.contains("open");

  if (isOpen) {
    panel.style.maxHeight = panel.scrollHeight + "px";

    requestAnimationFrame(() => {
      panel.style.maxHeight = "0px";
      card.classList.remove("open");
    });

    return;
  }

  card.classList.add("open");
  panel.style.maxHeight = panel.scrollHeight + "px";
}

function refreshOpenPanels() {
  const openPanels = document.querySelectorAll(".result-card.open .panel");

  openPanels.forEach(panel => {
    panel.style.maxHeight = panel.scrollHeight + "px";
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
