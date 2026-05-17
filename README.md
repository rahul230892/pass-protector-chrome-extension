# Pass Protector

A lightweight Chrome extension that locks selected websites behind a 4-digit PIN.

Pass Protector is useful when you briefly lend your laptop to someone but do not want them opening already-signed-in social media, messaging, or email websites from your Chrome profile.

## Features

- Lock any website domain, such as `instagram.com`, `facebook.com`, or `web.whatsapp.com`.
- Show a full-page lock screen whenever a protected website is opened.
- Unlock a website for 1 minute after the correct 4-digit PIN is entered.
- Automatically lock the website again after 1 minute.
- Manage protected websites from a simple extension settings page.
- Store settings locally in Chrome.
- Store the PIN as a local SHA-256 hash instead of plain text.

## Load in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `/Users/rahul/Documents/Applications/PassProtectorWebsite`.
5. Click the Pass Protector extension icon and set your 4-digit code.

## Install From GitHub

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder.
6. Open the extension settings and set your 4-digit PIN.

## Configure Locked Websites

Open the extension popup or options page and add websites with the textbox. Saved websites are shown as an ordered list:

```text
instagram.com
facebook.com
web.whatsapp.com
gmail.com
```

Subdomains are included automatically. For example, adding `instagram.com` also protects `www.instagram.com`.

## How It Works

The extension uses:

- `manifest.json` for the Chrome Extension Manifest V3 configuration.
- `src/background.js` for PIN verification, lock state, settings, and the 1-minute unlock timer.
- `src/content.js` for the full-page website lock screen.
- `src/options.html`, `src/options.css`, and `src/options.js` for the settings UI.

## Permissions

Pass Protector requests:

- `storage`: saves your PIN hash and protected website list locally.
- `<all_urls>` host access: checks whether the current website should be locked.

The extension does not send your PIN, websites, browsing data, or settings to any server.

## Security Notes

This is designed for casual privacy when lending your laptop to someone briefly. It keeps honest people out of already-signed-in accounts, but it is not a replacement for a separate OS user account, Chrome guest profile, or locking your computer.

For the strongest version of this idea, use Chrome's Guest mode or create a separate Chrome profile for other people. This extension is still useful as a quick extra guardrail for your main profile.

## Development

No build step is required. Edit the files directly, then reload the extension from `chrome://extensions`.

To run quick JavaScript syntax checks:

```sh
node --check src/background.js
node --check src/content.js
node --check src/options.js
```

## License

MIT
