---
name: run-gogood-site
description: Run, launch, serve, screenshot, or verify the GO GOOD concept site — starts a local HTTP server and drives the scroll-scrubbed film in headless Chrome via the Playwright driver. Use for "run the site", "test the scroll film", "screenshot the site".
---

# Run the GO GOOD concept site

Static single-page site (`index.html` + 198 `frames/frame_NNN.{jpg,webp}`
pairs). No build step. It is driven by
`.claude/skills/run-gogood-site/driver.mjs` — a Playwright script that
launches system Chrome headless, waits for the frame-preload loader to
dismiss, scrubs the 1100vh scroll film to five caption stops, checks the
flavours/footer sections, and screenshots everything.

All paths below are relative to the project root (`index.html`'s dir).

## Prerequisites

- `python3` (any; only used for `http.server`)
- Node ≥ 18 with npm
- System Google Chrome at `/usr/bin/google-chrome` (the driver launches
  `channel: 'chrome'` — see Gotchas)

Playwright's npm package is NOT installed in this repo (the site has no
`package.json`). Install it into a scratch dir once per machine:

```bash
mkdir -p /tmp/gg_driver && cd /tmp/gg_driver \
  && npm init -y >/dev/null \
  && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright --no-audit --no-fund
```

`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` matters — you don't need its
browsers (system Chrome is used) and the download is slow.

## Run (agent path)

From the project root:

```bash
# 1. serve the site
python3 -m http.server 8642 --bind 127.0.0.1 >/dev/null 2>&1 &

# 2. run the driver from the dir where playwright is installed
cd /tmp/gg_driver && node /path/to/project/.claude/skills/run-gogood-site/driver.mjs
```

Output: `PASS`/`FAIL` per check (loader, WebP negotiation, 5 caption
stops, CTA, network failures); exit 0 iff all pass. Screenshots land in
`/tmp/gogood-run/` — `00_hero.png` … `07_footer.png`. **Look at them**;
a black canvas means frames didn't load.

Stop the server afterwards: `pkill -f 'http.server 8642'`.

To drive it further (different frames, mobile viewport), edit the
`STOPS` table in `driver.mjs` or pass `--url` for another port.

## Run (human path)

`python3 -m http.server 8642` in the project root, open
`http://127.0.0.1:8642/`, scroll slowly. Useless headless.

## Gotchas

- **Use `channel: 'chrome'`, not Playwright's bundled Chromium.** The
  `~/.cache/ms-playwright` browsers on this machine belong to older
  Playwright versions; a freshly-installed `playwright` package wants a
  build that isn't cached and dies with "Executable doesn't exist …
  chromium_headless_shell-NNNN". System Chrome always works.
- **Must open via HTTP, not `file://`** — the film frames are fetched
  by path; `file://` breaks canvas/CORS behavior.
- **Scrolling to a film frame is not instant.** The playhead eases
  toward the scroll target (EASE 0.085). The driver waits on the
  `#frameCount` HUD text before screenshotting; if you script your own
  scrub, do the same or you'll capture a mid-glide frame.
- **`--virtual-time-budget` screenshots (bare headless Chrome) can't
  scroll** — anchor URLs like `/#flavours` render at scroll-top. That's
  why the driver exists; don't try to smoke-test sections with plain
  `google-chrome --headless --screenshot`.
- The loader has an 8 s failsafe dismiss; on a slow disk the first
  screenshot may show partially-loaded frames. The driver waits for the
  `done` class instead of a fixed sleep.
- **Screenshot right after loader dismissal catches the fade-out.** The
  `done` class starts a 0.6 s opacity transition; the driver sleeps
  800 ms after it before the hero screenshot, or the "Go on. Go good."
  wordmark ghosts over the film frame.

## Troubleshooting

- `Cannot find package 'playwright'` — you ran `node` from a dir
  without the scratch install. `cd /tmp/gg_driver` first (the driver
  resolves playwright from CWD).
- `Executable doesn't exist … ms-playwright/…` — the driver was edited
  to use bundled Chromium. Restore `chromium.launch({ channel: 'chrome' })`.
- `net::ERR_CONNECTION_REFUSED` — server not running or wrong port;
  default is 8642, override with `--url http://127.0.0.1:<port>/`.
