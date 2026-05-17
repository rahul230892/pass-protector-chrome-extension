const DEFAULT_LOCKED_SITES = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "linkedin.com",
  "reddit.com",
  "snapchat.com",
  "web.whatsapp.com",
  "web.telegram.org",
  "discord.com",
  "youtube.com",
  "gmail.com",
  "accounts.google.com"
];

const UNLOCK_DURATION_MS = 60 * 1000;
const unlockedTabs = new Map();

chrome.runtime.onInstalled.addListener(async () => {
  const { lockedSites } = await chrome.storage.local.get("lockedSites");

  if (!Array.isArray(lockedSites)) {
    await chrome.storage.local.set({ lockedSites: DEFAULT_LOCKED_SITES });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error("Pass Protector error:", error);
      sendResponse({ ok: false, error: "Something went wrong. Please try again." });
    });

  return true;
});

chrome.tabs?.onRemoved?.addListener((tabId) => {
  unlockedTabs.delete(tabId);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.lockedSites) {
    unlockedTabs.clear();
  }
});

async function handleMessage(message, sender) {
  if (!message || typeof message.type !== "string") {
    return { ok: false, error: "Unknown message." };
  }

  if (message.type === "GET_LOCK_STATUS") {
    return getLockStatus(message.url, sender.tab?.id);
  }

  if (message.type === "VERIFY_PIN") {
    return verifyPin(message.pin, message.url, sender.tab?.id);
  }

  if (message.type === "LOCK_NOW") {
    lockTab(sender.tab?.id, message.url);
    return { ok: true };
  }

  if (message.type === "GET_SETTINGS") {
    const settings = await getSettings();
    return {
      ok: true,
      hasPin: Boolean(settings.pinHash),
      lockedSites: settings.lockedSites
    };
  }

  if (message.type === "OPEN_OPTIONS") {
    await chrome.runtime.openOptionsPage();
    return { ok: true };
  }

  if (message.type === "SAVE_SETTINGS") {
    return saveSettings(message.settings);
  }

  return { ok: false, error: "Unsupported action." };
}

async function getLockStatus(rawUrl, tabId) {
  const settings = await getSettings();
  const hostname = getHostname(rawUrl);
  const isProtected = Boolean(hostname) && isHostLocked(hostname, settings.lockedSites);
  const hasPin = Boolean(settings.pinHash);

  if (!isProtected) {
    return { ok: true, isProtected: false, isLocked: false, hasPin };
  }

  const isLocked = !isTabUnlocked(tabId, hostname);
  return {
    ok: true,
    isProtected,
    isLocked,
    hasPin,
    unlockDurationMs: UNLOCK_DURATION_MS
  };
}

async function verifyPin(pin, rawUrl, tabId) {
  const hostname = getHostname(rawUrl);
  const settings = await getSettings();

  if (!hostname || !isHostLocked(hostname, settings.lockedSites)) {
    return { ok: true, unlocked: true, unlockDurationMs: UNLOCK_DURATION_MS };
  }

  if (!/^\d{4}$/.test(String(pin || ""))) {
    return { ok: false, error: "Enter the 4-digit code." };
  }

  if (!settings.pinHash) {
    return { ok: false, needsSetup: true, error: "Set your 4-digit code first." };
  }

  const attemptedHash = await hashPin(pin);

  if (attemptedHash !== settings.pinHash) {
    return { ok: false, error: "Incorrect code." };
  }

  unlockTab(tabId, hostname);
  return { ok: true, unlocked: true, unlockDurationMs: UNLOCK_DURATION_MS };
}

async function getSettings() {
  const data = await chrome.storage.local.get(["pinHash", "lockedSites"]);

  return {
    pinHash: data.pinHash || "",
    lockedSites: normalizeSites(data.lockedSites || DEFAULT_LOCKED_SITES)
  };
}

async function saveSettings(settings = {}) {
  const updates = {};

  if (Array.isArray(settings.lockedSites)) {
    updates.lockedSites = normalizeSites(settings.lockedSites);
  }

  if (Object.prototype.hasOwnProperty.call(settings, "pin")) {
    const pin = String(settings.pin || "");

    if (!/^\d{4}$/.test(pin)) {
      return { ok: false, error: "PIN must be exactly 4 digits." };
    }

    updates.pinHash = await hashPin(pin);
  }

  await chrome.storage.local.set(updates);
  unlockedTabs.clear();

  return { ok: true };
}

function unlockTab(tabId, hostname) {
  if (typeof tabId !== "number" || !hostname) {
    return;
  }

  unlockedTabs.set(tabId, {
    hostname,
    expiresAt: Date.now() + UNLOCK_DURATION_MS
  });
}

function lockTab(tabId) {
  if (typeof tabId !== "number") {
    return;
  }

  unlockedTabs.delete(tabId);
}

function isTabUnlocked(tabId, hostname) {
  if (typeof tabId !== "number" || !hostname) {
    return false;
  }

  const entry = unlockedTabs.get(tabId);

  if (!entry || entry.hostname !== hostname) {
    return false;
  }

  if (Date.now() > entry.expiresAt) {
    unlockedTabs.delete(tabId);
    return false;
  }

  return true;
}

function isHostLocked(hostname, lockedSites) {
  return lockedSites.some((site) => hostname === site || hostname.endsWith(`.${site}`));
}

function normalizeSites(sites) {
  return [...new Set(
    sites
      .map((site) => String(site).trim().toLowerCase())
      .map((site) => site.replace(/^https?:\/\//, "").replace(/^www\./, ""))
      .map((site) => site.split("/")[0])
      .filter(Boolean)
  )].sort();
}

function getHostname(rawUrl) {
  try {
    const url = new URL(rawUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function hashPin(pin) {
  const bytes = new TextEncoder().encode(String(pin));
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
