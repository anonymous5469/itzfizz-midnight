import { test as base, expect } from '@playwright/test';
import { metricStages } from '../src/animation/constants.js';
import { carFrontRatio } from '../src/data/car.js';

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') {
        const expectedAssetFailure = test.info().title.includes('missing car artwork')
          && message.text().startsWith('Failed to load resource');
        if (!expectedAssetFailure) errors.push(message.text());
      }
    });
    await use(page);
    expect(errors, 'Unexpected console/page errors').toEqual([]);
  },
});

async function sceneState(page) {
  return page.evaluate(frontRatio => {
    const road = document.querySelector('.route');
    const car = document.querySelector('.car');
    const headline = document.querySelector('.headline');
    const r = road.getBoundingClientRect();
    const c = car.getBoundingClientRect();
    const h = headline.getBoundingClientRect();
    const headlineLeft = h.left - r.left;
    const frontOffset = c.width * frontRatio;
    const inset = parseFloat(getComputedStyle(road).paddingLeft) || 0;
    const startX = Math.min(inset, Math.max(0, (r.width - c.width) / 2));
    const travel = Math.max(0, r.width - c.width - startX) - startX;
    const content = document.querySelector('.headline-content');
    const clip = getComputedStyle(headline).clipPath;
    const rightInset = Number(clip.match(/inset\(0px ([\d.e-]+)%/)?.[1] ?? 0);
    return {
      progress: (c.left - r.left - startX) / travel,
      carFront: c.left - r.left + frontOffset,
      x: c.left - r.left,
      carWidth: c.width,
      carHeight: c.height,
      roadHeight: r.height,
      width: r.width,
      gutter: startX,
      contentOpacity: Number(getComputedStyle(content).opacity),
      contentY: new DOMMatrix(getComputedStyle(content).transform).f,
      headlineLeft,
      headlineRight: headlineLeft + h.width,
      headlineWidth: h.width,
      headlineRect: { left: h.left, right: h.right, top: h.top, bottom: h.bottom },
      frontAbsolute: c.left + frontOffset,
      visibleWidth: h.width * (1 - rightInset / 100),
      maskBoundary: headlineLeft + h.width * (1 - rightInset / 100),
      trailEnd: new DOMMatrix(getComputedStyle(document.querySelector('.trail')).transform).a * r.width,
      cards: [...document.querySelectorAll('.metric-card')].map(el => Number(getComputedStyle(el).opacity)),
      cardY: [...document.querySelectorAll('.metric-card')].map(el => new DOMMatrix(getComputedStyle(el).transform).f),
      characters: [...document.querySelectorAll('.headline-char')].map(el => ({
        opacity: Number(getComputedStyle(el).opacity),
        y: new DOMMatrix(getComputedStyle(el).transform).f,
      })),
      distance: document.querySelector('.hero-section').offsetHeight - document.querySelector('.hero-scene').offsetHeight,
    };
  }, carFrontRatio);
}

// Pixel-level proof: hiding the entire headline must not change any pixels ahead
// of the painted bumper. This checks real rendering, not merely inline styles.
async function assertNoTextAhead(page, state) {
  const viewport = page.viewportSize();
  const h = state.headlineRect;
  const x = Math.max(0, Math.ceil(Math.max(h.left, state.frontAbsolute)) + 1);
  const right = Math.min(viewport.width, Math.floor(h.right));
  if (right <= x) return;
  const y = Math.max(0, Math.floor(h.top));
  const height = Math.min(viewport.height, Math.ceil(h.bottom)) - y;
  const clip = { x, y, width: right - x, height };
  const before = await page.screenshot({ clip });
  const previous = await page.locator('.headline').evaluate(el => {
    const value = el.style.visibility;
    el.style.visibility = 'hidden';
    return value;
  });
  try {
    const withoutHeadline = await page.screenshot({ clip });
    expect(before.equals(withoutHeadline), 'No rendered text pixels ahead of the car').toBe(true);
  } finally {
    await page.locator('.headline').evaluate((el, value) => { el.style.visibility = value; }, previous);
  }
}

async function goToProgress(page, p) {
  // A live media-query change is applied asynchronously by the browser.
  await expect(page.locator('.car')).toBeVisible();
  await expect.poll(async () => (await sceneState(page)).distance).toBeGreaterThan(0);
  const { distance } = await sceneState(page);
  await page.evaluate(y => window.scrollTo(0, y), distance * p);
  await expect.poll(async () => (await sceneState(page)).progress).toBeCloseTo(p, 2);
  // Allow the next browser paint to apply clipping and metric opacity.
  await page.waitForTimeout(50);
}

function expectedReveal(state) {
  const inset = state.gutter;
  const overlap = Math.max(0, inset + state.carWidth * carFrontRatio - state.headlineLeft);
  return Math.max(0, Math.min(state.headlineWidth,
    state.carFront - state.headlineLeft - overlap * (1 - state.progress)));
}

test('reference composition contains only the hero and no landing-page additions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('main > section')).toHaveCount(1);
  await expect(page.locator('header, footer, nav, .closing')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Driven by progress');
  await expect(page.locator('.hero-scene')).toHaveCSS('background-color', 'rgb(11, 13, 16)');
  await expect(page.locator('.route')).toHaveCSS('background-color', 'rgb(17, 21, 26)');
  await expect(page.locator('.headline')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('.metric-value').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('.metric-percent').first()).toHaveCSS('color', 'rgb(198, 255, 61)');
  await expect(page.locator('.trail')).not.toHaveCSS('background-image', 'none');
  const state = await sceneState(page);
  expect(state.carHeight).toBe(184);
  expect(state.carWidth).toBeCloseTo(184 * 13 / 6, 1);
  expect(state.cards).toEqual([0, 0, 0, 0]);
  const road = await page.locator('.route').boundingBox();
  expect(road.x).toBe(0);
  expect(road.width).toBe(1440);
  expect(road.y).toBe(350);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/hero-start.png' });
});

test('car, trail, headline mask and statistics follow forward and reverse scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  for (const p of [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0]) {
    await goToProgress(page, p);
    const state = await sceneState(page);
    expect(Math.abs(state.carFront - state.trailEnd)).toBeLessThan(2);
    const expectedWidth = expectedReveal(state);
    expect(Math.abs(state.visibleWidth - expectedWidth)).toBeLessThan(0.5);
    expect(state.maskBoundary).toBeLessThanOrEqual(state.carFront + 0.5);
    state.cards.forEach((opacity, index) => {
      const { start, end } = metricStages[index];
      const expected = Math.max(0, Math.min(1, (p - start) / (end - start)));
      expect(opacity).toBeCloseTo(expected, 2);
      expect(state.cardY[index]).toBeCloseTo(14 * (1 - expected), 1);
    });
    if (p === 0.5) await page.screenshot({ path: 'test-results/hero-halfway.png' });
    if (p === 0) {
      expect(state.x).toBeGreaterThanOrEqual(0);
      expect(state.x + state.carWidth).toBeLessThanOrEqual(state.width);
    }
    if (p === 1) {
      expect(state.visibleWidth).toBeCloseTo(state.headlineWidth, 2);
      expect(state.x + state.carWidth).toBeCloseTo(state.width - state.gutter, 1);
      expect(state.x).toBeGreaterThanOrEqual(0);
    }
  }
  expect(errors).toEqual([]);
});

test('car and statistics do not autoplay while scroll stays still', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(250);
  const first = await sceneState(page);
  await page.waitForTimeout(1000);
  const second = await sceneState(page);
  expect(second.x).toBe(first.x);
  expect(second.cards).toEqual(first.cards);
  expect(second.cards).toEqual([0, 0, 0, 0]);
});

test('mid-scroll refresh, rapid reversals and resize retain synchronized state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await goToProgress(page, 0.5);
  await page.reload();
  await expect.poll(async () => (await sceneState(page)).progress).toBeCloseTo(0.5, 2);
  await expect(page.locator('.headline-content')).toHaveCSS('opacity', '1');
  for (const p of [0.8, 0.1, 1, 0.3, 0.65]) await goToProgress(page, p);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await goToProgress(page, 0.5);
  const state = await sceneState(page);
  expect(Math.abs(state.carFront - state.trailEnd)).toBeLessThan(2);
  expect(state.visibleWidth).toBeCloseTo(expectedReveal(state), 1);
  await goToProgress(page, 0);
  expect((await sceneState(page)).cards).toEqual([0, 0, 0, 0]);
});

for (const viewport of [
  { width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 },
  { width: 375, height: 812 },
  { width: 390, height: 844 }, { width: 320, height: 568 },
  { width: 844, height: 390 }, { width: 844, height: 360 },
]) {
  test(`editorial statistics surround the road without overlap at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await goToProgress(page, 0.75);
    for (const statistic of await page.locator('.metric-card').all()) {
      await expect(statistic).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(statistic).toHaveCSS('background-image', 'none');
      await expect(statistic).toHaveCSS('border-radius', '0px');
      await expect(statistic).toHaveCSS('border-top-width', '0px');
      await expect(statistic).toHaveCSS('backdrop-filter', 'none');
      await expect(statistic).toHaveCSS('box-shadow', 'none');
      await expect(statistic).toHaveCSS('padding', '0px');
      await expect(statistic).toHaveCSS('text-align', 'left');
      await expect(statistic.locator('.metric-description')).toHaveCSS('color', 'rgb(195, 202, 211)');
      const typography = await statistic.evaluate(el => {
        const number = el.querySelector('.metric-value');
        const label = el.querySelector('.metric-description');
        const style = getComputedStyle(label);
        return {
          numberLeft: number.getBoundingClientRect().left,
          labelLeft: label.getBoundingClientRect().left,
          fontSize: parseFloat(style.fontSize),
          lineHeight: parseFloat(style.lineHeight),
        };
      });
      expect(typography.labelLeft).toBeCloseTo(typography.numberLeft, 2);
      const expectedSize = viewport.height <= 360 ? 12 : viewport.height <= 600 ? 13 : viewport.width <= 767 ? 14 : 15;
      expect(typography.fontSize).toBe(expectedSize);
      expect(typography.lineHeight / typography.fontSize).toBeGreaterThanOrEqual(1.44);
    }
    await expect(page.locator('.metric-value')).toHaveText(['58%', '23%', '27%', '40%']);
    await expect(page.locator('.metric-description')).toHaveText([
      'Increase in pick up point use', 'Decrease in customer phone calls',
      'Increase in pick up point use', 'Decrease in customer phone calls',
    ]);
    const geometry = await page.evaluate(() => {
      const r = document.querySelector('.route').getBoundingClientRect();
      const h = document.querySelector('.headline').getBoundingClientRect();
      const c = document.querySelector('.car').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        road: { top: r.top, bottom: r.bottom },
        headline: { bottom: h.bottom, right: h.right },
        carTop: c.top,
        cards: [...document.querySelectorAll('.metric-card')].map(el => {
          const b = el.getBoundingClientRect();
          return { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
        }),
      };
    });
    expect(geometry.overflow).toBe(false);
    expect(geometry.headline.right).toBeLessThanOrEqual(viewport.width);
    if (viewport.width <= 767) expect(geometry.headline.bottom).toBeLessThan(geometry.carTop);
    geometry.cards.forEach((card, index) => {
      expect(card.left).toBeGreaterThanOrEqual(0);
      expect(card.right).toBeLessThanOrEqual(viewport.width);
      expect(card.top).toBeGreaterThanOrEqual(0);
      expect(card.bottom).toBeLessThanOrEqual(viewport.height);
      const topRow = viewport.width <= 767 ? index < 2 : index === 0 || index === 2;
      if (topRow) expect(card.bottom).toBeLessThan(geometry.road.top);
      else expect(card.top).toBeGreaterThan(geometry.road.bottom);
    });
    const [first, second, third, fourth] = geometry.cards;
    if (viewport.width <= 767) {
      expect(second.left - first.right).toBeGreaterThanOrEqual(16);
      expect(fourth.left - third.right).toBeGreaterThanOrEqual(16);
    } else {
      expect(third.left - first.right).toBeGreaterThanOrEqual(16);
      expect(fourth.left - second.right).toBeGreaterThanOrEqual(16);
      expect(first.left).toBeCloseTo(viewport.width - third.right, 1);
      expect(second.left).toBeCloseTo(viewport.width - fourth.right, 1);
    }
    for (const p of [0, 1]) {
      await goToProgress(page, p);
      const state = await sceneState(page);
      if (p === 0) {
        expect(state.x).toBeCloseTo(state.gutter, 1);
        expect(state.x).toBeGreaterThanOrEqual(0);
        expect(state.x + state.carWidth).toBeLessThanOrEqual(state.width);
        expect(state.visibleWidth).toBeLessThan(0.01);
      }
      else {
        expect(state.visibleWidth).toBeCloseTo(state.headlineWidth, 2);
        expect(state.x + state.carWidth).toBeCloseTo(state.width - state.gutter, 1);
        expect(state.x).toBeGreaterThanOrEqual(0);
      }
    }
    await goToProgress(page, 0.75);
    await page.screenshot({ path: `test-results/hero-${viewport.width}.png` });
  });
}

test('reduced motion and live preference changes keep all essential content readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const card of await page.locator('.metric-card').all()) await expect(card).toHaveCSS('opacity', '1');
  await expect(page.locator('.headline')).toHaveCSS('clip-path', 'none');
  await expect(page.locator('.headline-content')).toHaveCSS('opacity', '1');
  await expect(page.locator('.scroll-hint')).toBeHidden();
  const heights = await page.evaluate(() => ({ section: document.querySelector('.hero-section').offsetHeight, scene: document.querySelector('.hero-scene').offsetHeight }));
  expect(heights.section).toBe(heights.scene);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await goToProgress(page, 0.5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.headline')).toHaveCSS('clip-path', 'none');
  for (const card of await page.locator('.metric-card').all()) await expect(card).toHaveCSS('opacity', '1');
});

test('missing car artwork uses the vehicle fallback', async ({ page }) => {
  await page.route('**/car.svg', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.car-fallback')).toBeVisible();
});

test('scroll cue fades with the shared playhead and returns on reverse', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await goToProgress(page, 0);
    await expect(page.locator('.scroll-hint')).toHaveText('SCROLL TO EXPLORE');
    await expect(page.locator('.scroll-hint')).toHaveCSS('opacity', '0.65');
    const hint = await page.locator('.scroll-hint').boundingBox();
    expect(hint.y + hint.height).toBeLessThanOrEqual(viewport.height);
    const cards = await page.locator('.metric-card').evaluateAll(els => els.map(el => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }));
    for (const card of cards) {
      const intersects = hint.x < card.right && hint.x + hint.width > card.left
        && hint.y < card.bottom && hint.y + hint.height > card.top;
      expect(intersects).toBe(false);
    }
    await goToProgress(page, 0.03);
    const progress = (await sceneState(page)).progress;
    const opacity = await page.locator('.scroll-hint').evaluate(el => Number(getComputedStyle(el).opacity));
    expect(opacity).toBeCloseTo(0.65 * (1 - progress / 0.06), 3);
    await goToProgress(page, 0.25);
    await expect(page.locator('.scroll-hint')).toHaveCSS('opacity', '0');
    await goToProgress(page, 0);
    await expect(page.locator('.scroll-hint')).toHaveCSS('opacity', '0.65');
    expect((await sceneState(page)).visibleWidth).toBeLessThan(0.01);
  }
});

test('fully visible starting car keeps headline completely hidden at zero', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1200);
  const state = await sceneState(page);
  expect(state.x).toBeGreaterThanOrEqual(0);
  expect(state.x + state.carWidth).toBeLessThanOrEqual(state.width);
  expect(state.visibleWidth).toBeLessThan(0.01);
  expect(state.progress).toBeCloseTo(0, 2);
  expect(state.contentOpacity).toBe(1);
  expect(state.contentY).toBe(0);
  expect(state.characters.every(char => char.opacity === 1 && char.y === 0)).toBe(true);
  await expect(page.locator('.headline-base, .headline-letter')).toHaveCount(0);
  await assertNoTextAhead(page, state);
});

test('inner headline entrance fades and translates without moving the outer mask', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect.poll(async () => {
    const { contentOpacity } = await sceneState(page);
    return contentOpacity > 0 && contentOpacity < 1;
  }, { intervals: [16] }).toBe(true);
  const during = await sceneState(page);
  expect(during.contentOpacity).toBeGreaterThan(0);
  expect(during.contentOpacity).toBeLessThan(1);
  expect(during.contentY).toBeGreaterThan(0);
  expect(during.visibleWidth).toBeLessThan(0.01);
  await assertNoTextAhead(page, during);
  await expect.poll(async () => (await sceneState(page)).contentOpacity).toBe(1);
  await expect.poll(async () => (await sceneState(page)).contentY).toBe(0);
  const after = await sceneState(page);
  expect(after.x).toBe(during.x);
  expect(after.maskBoundary).toBeCloseTo(during.maskBoundary, 2);
  expect(after.contentY).toBe(0);
});

test('early scroll finishes the entrance and reverse scroll does not restart it', async ({ page }) => {
  await page.goto('/');
  await goToProgress(page, 0.25);
  await expect(page.locator('.headline-content')).toHaveCSS('opacity', '1');
  expect((await sceneState(page)).contentY).toBe(0);
  await goToProgress(page, 0);
  await expect(page.locator('.headline-content')).toHaveCSS('opacity', '1');
  await assertNoTextAhead(page, await sceneState(page));
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`rendered pixels respect the car leading edge forward and backward at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    for (const p of [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0]) {
      await goToProgress(page, p);
      const state = await sceneState(page);
      expect(state.maskBoundary).toBeLessThanOrEqual(state.carFront + 0.5);
      await assertNoTextAhead(page, state);
      await page.screenshot({ path: `test-results/reveal-${viewport.width}-${Math.round(p * 100)}.png` });
      if (p === 1) {
        // The mask must render identically to an entirely unclipped headline.
        const clipped = await page.locator('.headline').screenshot();
        const previous = await page.locator('.headline').evaluate(el => {
          const value = el.style.clipPath;
          el.style.clipPath = 'none';
          return value;
        });
        const fullyVisible = await page.locator('.headline').screenshot();
        expect(clipped.equals(fullyVisible), 'Entire headline is rendered at completion').toBe(true);
        await page.locator('.headline').evaluate((el, value) => { el.style.clipPath = value; }, previous);
      }
    }
  });
}

test('no-JavaScript fallback contains the heading and required metrics', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: 'WELCOME ITZFIZZ' })).toBeVisible();
  await expect(page.locator('noscript p').first()).toHaveText('58% — Increase in pick up point use');
  await context.close();
});
