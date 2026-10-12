# Midnight Automotive Experience — QA evidence

## Reference analysis

The live reference was opened in Chromium at 1440×900 and inspected at load and after 900px of scroll. Confirmed: light-gray surrounding viewport, central full-width 200px dark road, approximately 419×200px orange car, solid green trail, black 128px headline inside the road, and colored metric boxes above/below it. The reference's source was also inspected for letter and metric reveal behavior.

The earlier custom landing-page design has been removed, including navigation, introduction, progress footer, lane decorations, metric embellishments, and closing section.

## Checks performed

- `npm run build`: successful production output.
- Development Chromium acceptance suite: **21/21 passed**, including React Strict Mode and console-error assertions.
- Production preview at `http://localhost:4173`: **21/21 tests passed**. Tests reused the running Vite production preview, not the development server.
- Midnight composition: `#0B0D10` canvas, gradient lime trail, white headline, editorial white statistic numbers with smaller `#C6FF3D` percent signs, centered full-width road, approximately 399×184px original car with shadow/ambient light; no additional sections/header/footer/navigation.
- Initial state: the complete car is inside the viewport at every tested width. The zero-progress headline is fully masked, including after the inner entrance ends. Duplicate/base text layers remain absent.
- Entrance: the nested wrapper fades/translates while the outer mask and car remain fixed at zero scroll. Early scrolling finishes the entrance; returning to zero does not restart it. Mid-scroll refresh restores complete wrapper opacity rather than replaying the intro.
- Forward and reverse checkpoints: 0%, 25%, 50%, 75%, 100%; painted car front/trail edge align within 2px; headline clip width matches the position-derived boundary with initial-overlap compensation within 0.5px and never leads the nose; metric opacity **and 14px translation** retain their existing normalized timeline intervals.
- Pixel verification at 1440px and 375px: screenshots ahead of the car nose are identical before/after hiding the whole heading, proving no text is rendered there. At completion the heading screenshot is identical to one with clipping explicitly disabled.
- Desktop start/completion, tablet at 75%, and mobile halfway screenshots were opened and visually reviewed after polish. All checkpoints are captured below. The mask is fully open at completion; original desktop car-over-headline layering is retained (so the car can obscure underlying letters).
- Both start and end vehicle bounds are asserted across all eight tested viewport sizes. Symmetric responsive gutters (8–16px) keep the car fully contained at both endpoints; the finish position matches the calculated inset within 0.1px.
- Editorial statistics are balanced left/right on desktop/tablet; paired groups have at least 16px horizontal clearance. Mobile retains its existing 2×2 order. Tests at all eight sizes verify all four values/descriptions, transparent backgrounds, no background image/border/radius/shadow/backdrop blur, and zero container padding. Car/headline animation code was not modified in this refinement.
- Typography refinement: tabular white numbers, half-size lime percent signs, consistent left alignment, brighter `#C3CAD3` descriptions, 15px desktop / 14px mobile labels (13px short viewports, 12px at 360px height). Tests assert number/label left-edge alignment and line-height ratios of at least 1.44. The existing trail layer received restrained static lime glow; no additional elements or tweens.
- Scroll cue: present at zero, half faded around 3%, gone by 6%, and restored on reverse. Uses the existing shared playhead; no autoplay. Cue bounds and card clearance checked at 1440×900, 768×1024, and 320×568. Hidden in reduced motion.
- QA fixes: small-screen cue/card clearance corrected; entrance tests now wait for actual animation state rather than a fixed timer, and cue tests account for integer scroll-coordinate rounding.
- No autoplay: fixed scroll position leaves car/statistics unchanged over a one-second observation.
- Mid-scroll reload, direction changes, desktop-to-mobile resize, and return to zero preserve valid state.
- Layout sizes: **1440×900, 1024×768, 768×1024, 375×812**, plus 390×844, 320×568, 844×390, and 844×360. No horizontal overflow, overlapping statistic pairs, statistic/road overlap, or statistics outside the viewport. Mobile headline and car are vertically separated inside the road; heading bounds fit within the viewport.
- Reduced motion: complete readable heading/metrics, no extended sticky scene; live preference changes clear animation styles.
- Missing image: CSS car fallback appears.
- JavaScript disabled: heading and required metrics remain readable.
- No unexpected console errors or page-level exceptions across the acceptance suite. Development testing exposed a React 18 `fetchPriority` warning; the attribute was corrected to lowercase `fetchpriority`. The intentionally aborted image request is excluded only in its dedicated fallback test.

## Screenshots

### Headline reveal checkpoints

| Scroll | Desktop | Mobile |
|---|---|---|
| 0% | [1440px](previews/reveal-1440-0.png) | [375px](previews/reveal-375-0.png) |
| 25% | [1440px](previews/reveal-1440-25.png) | [375px](previews/reveal-375-25.png) |
| 50% | [1440px](previews/reveal-1440-50.png) | [375px](previews/reveal-375-50.png) |
| 75% | [1440px](previews/reveal-1440-75.png) | [375px](previews/reveal-375-75.png) |
| 100% | [1440px](previews/reveal-1440-100.png) | [375px](previews/reveal-375-100.png) |

### Responsive layouts

- [Initial desktop scene](previews/start.png)
- [Desktop at halfway](previews/halfway.png)
- [Desktop at 75%](previews/desktop.png)
- [1024px layout at 75%](previews/desktop-1024.png)
- [Tablet at 75%](previews/tablet.png)
- [Mobile at 75%](previews/mobile.png)
- [375px layout at 75%](previews/mobile-375.png)
- [Small mobile at 75%](previews/small-mobile.png)
- [Landscape at 75%](previews/landscape.png)

## Not established by these tests

- Latest Safari/Firefox compatibility and physical-phone gestures/orientation changes.
- Stable 60fps, performance trace results, or production LCP/CLS/INP.
- Pixel-identical vehicle artwork: the car SVG is original, not the reference McLaren asset.
- Hosted demo or repository publication.
- Measured car-shadow/filter compositing cost on low-end hardware. Shadows/glow are static layers carried by the existing car transform; statistic backdrop blur has been removed entirely.

These are verification limits, not claims that those checks have passed.
