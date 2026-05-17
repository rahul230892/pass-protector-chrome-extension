const OVERLAY_ID = "pass-protector-lock-screen";
let relockTimerId = 0;

if (window.top === window.self) {
  start();
}

async function start() {
  const status = await sendMessage({ type: "GET_LOCK_STATUS", url: location.href });

  if (!status?.ok || !status.isProtected) {
    return;
  }

  if (!status.hasPin || status.isLocked) {
    showLockScreen({ needsSetup: !status.hasPin });
    return;
  }

  scheduleRelock(status.unlockDurationMs);
}

function showLockScreen({ needsSetup = false, error = "" } = {}) {
  clearTimeout(relockTimerId);
  ensureDocumentElement();
  injectStyles();

  let overlay = document.getElementById(OVERLAY_ID);

  if (!overlay) {
    overlay = document.createElement("section");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    document.documentElement.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="pp-card">
      <div class="pp-mark">PP</div>
      <p class="pp-eyebrow">Pass Protector</p>
      <h1>${needsSetup ? "Set up your 4-digit code" : "This website is locked"}</h1>
      <p class="pp-copy">
        ${needsSetup
          ? "Create your PIN from the extension options, then come back to unlock protected websites."
          : "Enter your 4-digit code. This website will lock again automatically after 1 minute."}
      </p>
      ${needsSetup ? setupTemplate() : unlockTemplate(error)}
    </div>
  `;

  document.documentElement.classList.add("pass-protector-page-locked");

  if (!needsSetup) {
    const form = overlay.querySelector("form");
    const input = overlay.querySelector("input");
    input?.focus();
    form?.addEventListener("submit", handleUnlock);
  }
}

function setupTemplate() {
  return `
    <button class="pp-button" type="button" id="pp-open-options">Open setup</button>
  `;
}

function unlockTemplate(error) {
  return `
    <form class="pp-form">
      <label for="pp-pin">4-digit code</label>
      <input
        id="pp-pin"
        inputmode="numeric"
        maxlength="4"
        minlength="4"
        pattern="[0-9]{4}"
        autocomplete="off"
        autofocus
      />
      <button class="pp-button" type="submit">Unlock for 1 minute</button>
      <p class="pp-error" aria-live="polite">${escapeHtml(error)}</p>
    </form>
  `;
}

document.addEventListener("click", async (event) => {
  if (event.target?.id === "pp-open-options") {
    await sendMessage({ type: "OPEN_OPTIONS" });
  }
});

async function handleUnlock(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const input = form.querySelector("input");
  const button = form.querySelector("button");
  const errorEl = form.querySelector(".pp-error");
  const pin = input.value.trim();

  button.disabled = true;
  errorEl.textContent = "";

  const result = await sendMessage({ type: "VERIFY_PIN", pin, url: location.href });

  if (result?.ok && result.unlocked) {
    removeLockScreen();
    scheduleRelock(result.unlockDurationMs);
    return;
  }

  if (result?.needsSetup) {
    showLockScreen({ needsSetup: true });
    return;
  }

  errorEl.textContent = result?.error || "Could not unlock this site.";
  input.value = "";
  input.focus();
  button.disabled = false;
}

function scheduleRelock(durationMs = 60 * 1000) {
  clearTimeout(relockTimerId);
  relockTimerId = setTimeout(async () => {
    await sendMessage({ type: "LOCK_NOW", url: location.href });
    showLockScreen();
  }, durationMs);
}

function removeLockScreen() {
  document.getElementById(OVERLAY_ID)?.remove();
  document.documentElement.classList.remove("pass-protector-page-locked");
}

function injectStyles() {
  if (document.getElementById("pass-protector-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "pass-protector-styles";
  style.textContent = `
    html.pass-protector-page-locked,
    html.pass-protector-page-locked body {
      overflow: hidden !important;
    }

    #${OVERLAY_ID} {
      align-items: center !important;
      background:
        radial-gradient(circle at 15% 10%, rgba(73, 177, 150, 0.28), transparent 28%),
        radial-gradient(circle at 85% 20%, rgba(255, 188, 87, 0.24), transparent 24%),
        linear-gradient(135deg, #09151f 0%, #142d34 48%, #071016 100%) !important;
      box-sizing: border-box !important;
      color: #f6f1df !important;
      display: flex !important;
      font-family: Georgia, "Times New Roman", serif !important;
      inset: 0 !important;
      justify-content: center !important;
      min-height: 100vh !important;
      padding: 24px !important;
      position: fixed !important;
      z-index: 2147483647 !important;
    }

    #${OVERLAY_ID} * {
      box-sizing: border-box !important;
    }

    #${OVERLAY_ID} .pp-card {
      background: rgba(247, 241, 220, 0.96) !important;
      border: 1px solid rgba(255, 255, 255, 0.28) !important;
      border-radius: 28px !important;
      box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42) !important;
      color: #17211f !important;
      max-width: 430px !important;
      padding: 34px !important;
      text-align: center !important;
      width: min(100%, 430px) !important;
    }

    #${OVERLAY_ID} .pp-mark {
      align-items: center !important;
      background: #17362f !important;
      border-radius: 18px !important;
      color: #f8d36e !important;
      display: inline-flex !important;
      font: 700 18px/1 ui-monospace, SFMono-Regular, Menlo, monospace !important;
      height: 54px !important;
      justify-content: center !important;
      letter-spacing: 0.08em !important;
      margin-bottom: 18px !important;
      width: 54px !important;
    }

    #${OVERLAY_ID} .pp-eyebrow {
      color: #69766f !important;
      font: 700 12px/1.3 ui-sans-serif, system-ui, sans-serif !important;
      letter-spacing: 0.18em !important;
      margin: 0 0 10px !important;
      text-transform: uppercase !important;
    }

    #${OVERLAY_ID} h1 {
      color: #16211f !important;
      font: 700 30px/1.1 Georgia, "Times New Roman", serif !important;
      margin: 0 0 12px !important;
    }

    #${OVERLAY_ID} .pp-copy {
      color: #4e5d56 !important;
      font: 16px/1.55 ui-sans-serif, system-ui, sans-serif !important;
      margin: 0 0 24px !important;
    }

    #${OVERLAY_ID} .pp-form {
      display: grid !important;
      gap: 12px !important;
      text-align: left !important;
    }

    #${OVERLAY_ID} label {
      color: #34443e !important;
      font: 700 13px/1.3 ui-sans-serif, system-ui, sans-serif !important;
    }

    #${OVERLAY_ID} input {
      background: #fffaf0 !important;
      border: 2px solid #d6caa9 !important;
      border-radius: 16px !important;
      color: #17211f !important;
      font: 700 28px/1 ui-monospace, SFMono-Regular, Menlo, monospace !important;
      letter-spacing: 0.45em !important;
      outline: none !important;
      padding: 14px 12px 14px 22px !important;
      text-align: center !important;
      width: 100% !important;
    }

    #${OVERLAY_ID} input:focus {
      border-color: #26745f !important;
      box-shadow: 0 0 0 4px rgba(38, 116, 95, 0.18) !important;
    }

    #${OVERLAY_ID} .pp-button {
      background: #17362f !important;
      border: 0 !important;
      border-radius: 999px !important;
      color: #fff6d8 !important;
      cursor: pointer !important;
      font: 800 15px/1 ui-sans-serif, system-ui, sans-serif !important;
      padding: 15px 18px !important;
      transition: transform 160ms ease, opacity 160ms ease !important;
      width: 100% !important;
    }

    #${OVERLAY_ID} .pp-button:hover {
      transform: translateY(-1px) !important;
    }

    #${OVERLAY_ID} .pp-button:disabled {
      cursor: wait !important;
      opacity: 0.62 !important;
    }

    #${OVERLAY_ID} .pp-error {
      color: #a23a2f !important;
      font: 700 13px/1.4 ui-sans-serif, system-ui, sans-serif !important;
      min-height: 19px !important;
      margin: 0 !important;
      text-align: center !important;
    }
  `;

  document.documentElement.appendChild(style);
}

function ensureDocumentElement() {
  if (document.documentElement) {
    return;
  }

  const html = document.createElement("html");
  document.appendChild(html);
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
