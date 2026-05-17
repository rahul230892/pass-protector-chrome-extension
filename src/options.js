const form = document.getElementById("settings-form");
const pinInput = document.getElementById("pin");
const siteEntryInput = document.getElementById("site-entry");
const addSiteButton = document.getElementById("add-site");
const sitesList = document.getElementById("sites-list");
const siteCount = document.getElementById("site-count");
const emptyList = document.getElementById("empty-list");
const statusEl = document.getElementById("status");
let lockedSites = [];

loadSettings();

addSiteButton.addEventListener("click", () => {
  addSiteFromInput();
});

siteEntryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addSiteFromInput();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Saving...");

  const pin = pinInput.value.trim();

  if (pin && !/^\d{4}$/.test(pin)) {
    setStatus("PIN must be exactly 4 digits.", true);
    return;
  }

  if (lockedSites.length === 0) {
    setStatus("Add at least one website to lock.", true);
    return;
  }

  const settings = { lockedSites };

  if (pin) {
    settings.pin = pin;
  }

  const result = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    settings
  });

  if (!result?.ok) {
    setStatus(result?.error || "Could not save settings.", true);
    return;
  }

  pinInput.value = "";
  setStatus("Saved. Protected websites will now require your code.");
});

async function loadSettings() {
  const result = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });

  if (!result?.ok && !Array.isArray(result?.lockedSites)) {
    setStatus("Could not load settings.", true);
    return;
  }

  lockedSites = normalizeSites(result.lockedSites);
  renderSites();
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function addSiteFromInput() {
  const site = normalizeSite(siteEntryInput.value);

  if (!site) {
    setStatus("Enter a website domain first.", true);
    return;
  }

  if (lockedSites.includes(site)) {
    setStatus(`${site} is already in the locked list.`, true);
    siteEntryInput.value = "";
    siteEntryInput.focus();
    return;
  }

  lockedSites = [...lockedSites, site];
  siteEntryInput.value = "";
  siteEntryInput.focus();
  renderSites();
  setStatus(`${site} added. Remember to save settings.`);
}

function removeSite(siteToRemove) {
  lockedSites = lockedSites.filter((site) => site !== siteToRemove);
  renderSites();
  setStatus(`${siteToRemove} removed. Remember to save settings.`);
}

function renderSites() {
  sitesList.innerHTML = "";

  lockedSites.forEach((site) => {
    const item = document.createElement("li");
    const siteName = document.createElement("span");
    const removeButton = document.createElement("button");

    siteName.textContent = site;
    removeButton.className = "remove-button";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeSite(site));

    item.append(siteName, removeButton);
    sitesList.appendChild(item);
  });

  siteCount.textContent = `${lockedSites.length} ${lockedSites.length === 1 ? "site" : "sites"}`;
  emptyList.hidden = lockedSites.length > 0;
}

function normalizeSites(sites) {
  return [...new Set(sites.map(normalizeSite).filter(Boolean))];
}

function normalizeSite(site) {
  return String(site || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}
