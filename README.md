# ITZFIZZ — Midnight Automotive Experience

A cinematic redesign of the [reference hero](https://paraschaturvedi.github.io/car-scroll-animation/): midnight `#0B0D10` canvas, restrained `#C6FF3D` trail, white Space Grotesk headline, original orange top-view car with grounding shadow/ambient light, and four editorial statistics. Large white numbers, smaller lime percent signs, and muted labels replace the glass containers. No navigation or extra sections. The existing shared scroll timeline and statistic choreography are retained.

## Run

Node.js 18.19+ is supported; a current Node LTS is recommended.

```sh
npm install
npm run dev
```

```sh
npm run build
npm run preview
```

The build output is `dist/`. There are no external APIs or runtime secrets. Space Grotesk and Inter are self-hosted in `public/fonts/`, with their OFL licenses. Relative asset URLs support static hosting at a repository subpath.

## Animation

- A `300svh` container and `100svh` CSS-sticky scene reproduce the reference's effective three-viewport document length without combining CSS sticky and GSAP pin spacing.
- One GSAP ScrollTrigger timeline translates the vehicle, scales the green trail, updates a **single headline clip-path**, and fades/translates the unchanged metric boxes sequentially.
- The car starts fully inside the road, but the headline is completely masked at zero. There is no duplicate base layer that could reveal text ahead of its nose.
- A subtle 0.55-second opacity/10px vertical entrance affects only `.headline-content`, nested **inside** the clipped heading. Only the shared scroll timeline controls `clip-path`. Early scrolling completes the entrance; a mid-scroll refresh skips it; reverse scrolling does not replay it.
- `scrub: true` follows actual scroll immediately. No time-based car or statistics animation is present. Reversing scroll reverses every state.
- Card reveals use normalized equivalents of the reference's 400–600, 600–800, 800–1000, and 1000–1200px intervals over its 1800px drive.
- Road/headline rectangles and car width are measured at setup/refresh only. Resize rebuilds the scoped timeline and restores its playhead; there are no React state updates or layout reads on scroll ticks.
- The visible width is `clamp(carFront − headlineLeft − initialOverlap × (1 − progress), 0, headlineWidth)`. Initial-overlap compensation allows a contained car and hidden headline at zero; it retires smoothly with travel. The boundary never leads the painted nose. All inputs derive from the same timeline playhead and cached geometry.
- The car starts and finishes fully visible with matching responsive gutters (`startX = gutter`, `endX = roadWidth − carWidth − gutter`). Desktop car-over-headline layering and artwork are preserved. Local font completion schedules a geometry refresh, guarded against unmount.
- `SCROLL TO EXPLORE` fades from 0.65 opacity to zero over the first 6% of the same timeline and returns on reverse. It is hidden in reduced motion. There is no independent cue/trail autoplay.
- GSAP triggers, contexts, listeners, and scheduled frames are cleaned up on unmount, including React Strict Mode. Reload restoration includes a session-storage safeguard saved only on page exit; it is not written on every scroll tick.

## Responsive and reduced motion

Desktop retains the reference's 200px road and approximately 399×184px vehicle with clearance, with a 118px heading at 1440px and editorial statistics above/below. Font sizing uses `clamp()`. Mobile places the headline above the vehicle within the same road to protect readability. Mobile statistic layout matches DOM/reveal order: 58%, 23%, 27%, 40%.

Desktop/tablet statistics occupy balanced left/right columns with generous whitespace. Their backgrounds, borders, rounded corners, shadows, padding, and backdrop blur have been removed at every breakpoint. The existing `.metric-card` class and component name are retained solely for compatibility with animation hooks. Car travel, headline clipping, and sequential opacity/14px translation are unchanged by this refinement.

Typography polish uses aligned tabular numbers, smaller lime percent signs, brighter descriptions, and roomier label line-height. The existing trail hairline carries a restrained static two-layer glow, synchronized by its unchanged parent `scaleX`; no decorative elements or independent animation were added.

Reduced motion shows all lettering and metrics immediately, removes the long sticky scroll distance, and hides the stationary car so it cannot obscure the completed heading. Semantic heading/metric text remains available to screen readers even before visual reveals. A no-JavaScript fallback and missing-artwork fallback are included.

## Files

```text
src/components/HeroSection.jsx       Reference-oriented hero composition
src/components/MetricCard.jsx        Editorial statistics, retained animation hooks
src/animation/heroAnimation.js       Unified scroll timeline and lifecycle
src/animation/constants.js          Normalized metric reveal intervals
src/data/metrics.js                  Required values and baseline descriptions
src/data/car.js                      Painted-nose position within the unchanged SVG
src/styles.css                      Midnight tokens, lighting, responsive rules
public/fonts/                       Local variable fonts and OFL licenses
public/car.svg                      Original orange top-view vehicle artwork
tests/hero.spec.js                   Scroll and responsive browser tests
docs/QA.md                          Actual checks and verification limits
docs/previews/                      Screenshots of the revised implementation
```

## Tests

```sh
npx playwright install chromium
npm test
```

Tests automatically start a Vite development server at port 4173 when no server is already running. To test **production**, run `npm run build`, start `npm run preview -- --port 4173` in another terminal, then run `npm test`. To test development independently while the preview runs, use `TEST_PORT=4174 npm test` on Linux/macOS.

See [QA evidence](docs/QA.md) for what was actually tested. Do not infer real-phone, cross-browser, 60fps, or Core Web Vitals success from Chromium acceptance tests.

## Reference, differences, and asset usage

Reference: https://paraschaturvedi.github.io/car-scroll-animation/

Browser inspection at 1440×900 confirmed the reference's road at `y=350`, height `200px`, and vehicle at approximately `419×200px`. Its layout/colors/reveal choreography guide this implementation.

The reference's McLaren image is not redistributed because its usage rights have not been established. `public/car.svg` is original, more detailed sports-car artwork with sculpted paint, cockpit glass, carbon roof, engine bay, vents, tires, mirrors, and lights; it is not pixel-identical to the McLaren. No extra image-processing or animation libraries were added.

Other deliberate refinements: a fully visible starting car; a masked, inner-wrapper entrance that cannot expose text ahead of the nose; painted leading-edge synchronization rather than per-letter opacity thresholds; responsive geometry rather than overflowing fixed desktop text/cards; scroll-driven 14px card translations instead of a CSS opacity transition. The PRD's metric descriptions are preserved ("Decrease" rather than the reference's "Decreased").

## Deploy

GitHub Pages: `.github/workflows/deploy-pages.yml` builds and publishes `dist` automatically on pushes to `main` (or via manual workflow dispatch). Repository Pages settings must use **GitHub Actions** as the source. Vite's relative base keeps artwork and local fonts working under the repository subpath. No router rewrite is required.

Site: https://anonymous5469.github.io/itzfizz-midnight/

Repository: https://github.com/anonymous5469/itzfizz-midnight

Vercel/Netlify also support build `npm run build`, publish directory `dist`.
