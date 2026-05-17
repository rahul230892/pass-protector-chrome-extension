# Contributing

Thanks for helping improve Pass Protector.

## Local Development

1. Clone the repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project folder.
5. Make changes and click reload on the extension card.

## Checks

Run these before opening a pull request:

```sh
node --check src/background.js
node --check src/content.js
node --check src/options.js
```

## Pull Requests

Please include:

- What changed.
- Why it changed.
- How you tested it.
- Screenshots or short videos for UI changes when useful.
