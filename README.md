# GO GOOD — Concept Microsite

A single-page scroll-scrubbed product film for a fictional hydration drink
brand. Instead of an autoplaying hero video, the actual product film is
decoded into frames and played back frame-by-frame as the user scrolls,
so scroll position directly controls playback.

**Live structure:** one `index.html`, no build step, no dependencies.
Open it directly in a browser or serve the folder statically.

---

## How it works

1. The source film (`CINEMATIC PRODUCT VIDEO _ Go Good Drinks.mp4`) was
   decoded into 198 individual frames at 10 fps, saved into `/frames`.
2. Each frame exists as both `.jpg` (fallback) and `.webp` (smaller,
   used automatically when the browser supports it).
3. A canvas element (`#productCanvas`) is pinned full-screen for the
   height of `.hero-driver` (1100vh). As the user scrolls through that
   space, JS maps scroll progress (0–1) to a frame index (0–197) and
   draws that frame to the canvas.
4. Playback is eased (not a hard snap) so fast or jittery scrolling
   (trackpads, mouse wheels) doesn't look glitchy, while still tracking
   the user's scroll closely rather than lagging behind it.
5. Frames load in two passes: a "critical set" (every 2nd frame) loads
   first and the loader dismisses as soon as that's ready; the
   remaining in-between frames fill in quietly in the background. This
   means the page becomes interactive fast, and any frame the user
   scrubs to before the full set is loaded falls back to the nearest
   already-loaded frame instead of showing a blank canvas.
6. Scroll-timed captions (`.caption` elements) fade in/out based on
   which frame range they're assigned to via `data-start` / `data-end`
   attributes.

## Regenerating frames from the source video

If you swap in a new or higher-quality video, regenerate the frame set
with ffmpeg. Run this from the project root:

```bash
# extract frames at native resolution, 10 frames per second of video
ffmpeg -i "your-video.mp4" -vf "fps=10" -q:v 2 frames/frame_%03d.jpg -y
```

Then generate matching webp versions (smaller, used first when supported):

```bash
python3 -c "
from PIL import Image
import glob
for f in sorted(glob.glob('frames/*.jpg')):
    Image.open(f).save(f.rsplit('.',1)[0] + '.webp', 'WEBP', quality=82, method=6)
"
```

**Keep frames at the source video's native resolution.** Downscaling
before saving throws away real detail that can't be recovered later —
the canvas stretches these images to fill the full browser viewport, so
any softness in the source frames becomes very visible on large
screens. If you extract a different frame count, update `FRAME_COUNT`
in the `<script>` block at the bottom of `index.html` to match.

## Tuning the scroll feel

Two constants near the top of the script control how the scrubbing
feels:

- `EASE` — how tightly the displayed frame tracks the raw scroll
  position. Closer to `1` snaps instantly to scroll (can look jittery
  on trackpads); closer to `0` smooths things out but can start to feel
  laggy if set too low. Current values (`0.28` desktop, `0.35` touch)
  aim for smooth-but-responsive.
- `CRITICAL_STEP` — how dense the first preload pass is. `2` means
  every other frame loads before the loader dismisses. Lower this
  toward `1` for a smoother very-first scroll on a slow connection at
  the cost of a longer initial load; raise it for a faster initial load
  at the cost of a rougher first scrub before the rest fill in.

`.hero-driver { height: 1100vh; }` controls how much scroll distance
the whole film takes to play through. Taller = slower, more deliberate
scroll-per-frame; shorter = faster playback relative to scroll speed.

## Deploying

Static files only — any static host works (GitHub Pages, Netlify,
Vercel, S3, etc.). Just make sure `index.html` and the `frames/` folder
stay together in the same directory structure; the JS references frames
with relative paths (`frames/frame_XXX.webp`).

## Known limits

- Frame resolution is capped by the source video's native resolution
  (currently 1280×720). Ultra-wide or very high-DPI displays will
  upscale slightly past that ceiling — a higher-resolution source video
  is the only real fix.
- All 198 frames (both formats) currently ship in the repo, which makes
  it a fairly heavy clone/checkout. For a production deployment, moving
  `/frames` to a CDN or object storage bucket instead of serving it
  directly from the repo would be worth doing.
