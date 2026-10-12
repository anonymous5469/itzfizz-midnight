import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { metricStages } from './constants';
import { carFrontRatio } from '../data/car';

gsap.registerPlugin(ScrollTrigger);

export function setupHeroAnimation(root) {
  const media = gsap.matchMedia();
  const context = gsap.context(() => {
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const route = root.querySelector('.route');
      const car = root.querySelector('.car');
      const trail = root.querySelector('.trail');
      const headline = root.querySelector('.headline');
      const content = root.querySelector('.headline-content');
      const hint = root.querySelector('.scroll-hint');
      const cards = [...root.querySelectorAll('.metric-card')];
      const setClip = gsap.quickSetter(headline, 'clipPath');
      // The outer heading owns the scroll mask. This inner wrapper owns only
      // the load-time entrance, so it cannot reveal pixels outside that mask.
      const intro = gsap.timeline({ paused: true }).fromTo(content,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
      );
      let introDecided = false;
      const finishIntro = () => {
        introDecided = true;
        if (intro.progress() < 1) intro.progress(1).pause();
      };
      let drive;
      let frame;
      let refreshFrame;
      let restored = false;
      const storageKey = `itzfizz-scroll:${window.location.pathname}`;
      const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
      let savedScroll = null;
      try {
        const value = sessionStorage.getItem(storageKey);
        if (isReload && value !== null) savedScroll = Number(value);
      } catch { /* Native browser restoration still works when storage is unavailable. */ }
      const rememberScroll = () => {
        try { sessionStorage.setItem(storageKey, String(window.scrollY)); } catch { /* Optional reload safeguard. */ }
      };

      const build = () => {
        const scroll = window.scrollY;
        drive?.scrollTrigger?.kill();
        drive?.kill();
        // Layout is measured only during setup/refresh, never during a scroll tick.
        const roadRect = route.getBoundingClientRect();
        const headlineRect = headline.getBoundingClientRect();
        const carWidth = car.getBoundingClientRect().width;
        const width = roadRect.width;
        const headlineLeft = headlineRect.left - roadRect.left;
        const headlineWidth = headlineRect.width;
        const frontOffset = carWidth * carFrontRatio;
        const inset = parseFloat(getComputedStyle(route).paddingLeft) || 0;
        // Symmetric endpoint clearance, while keeping the full artwork contained.
        const gutter = Math.min(inset, Math.max(0, (width - carWidth) / 2));
        const startX = gutter;
        const endX = Math.max(startX, width - carWidth - gutter);
        const travel = endX - startX;
        const initialOverlap = Math.max(0, startX + frontOffset - headlineLeft);
        const reveal = progress => {
          const carFront = startX + progress * travel + frontOffset;
          // Retire the initial overlap as the car travels: zero starts hidden,
          // and the boundary always stays behind (never ahead of) the nose.
          const visibleWidth = gsap.utils.clamp(0, headlineWidth,
            carFront - headlineLeft - initialOverlap * (1 - progress));
          const rightInset = headlineWidth > 0 ? 100 * (1 - visibleWidth / headlineWidth) : 100;
          // Removing the completed mask also preserves fractional glyph-edge
          // antialiasing that an inset(0) box can trim on narrow viewports.
          setClip(headlineWidth > 0 && visibleWidth >= headlineWidth
            ? 'none' : `inset(0 ${rightInset}% 0 0)`);
        };

        reveal(0);
        gsap.set(cards, { opacity: 0, y: 14 });
        drive = gsap.timeline({
          defaults: { ease: 'none' },
          // One authoritative playhead drives translation, trail, cards, and mask.
          // All geometry above is cached: this callback never reads layout or sets React state.
          onUpdate() {
            const progress = this.progress();
            reveal(progress);
            // Early scrolling or a restored mid-scroll page must never leave
            // partially transparent text, or restart the entrance on backscroll.
            if (progress > 0) finishIntro();
          },
          scrollTrigger: {
            id: 'hero-drive',
            trigger: root,
            start: 'top top',
            end: 'bottom bottom',
            // Direct scrubbing matches actual scroll immediately, with no autoplay/catch-up loop.
            scrub: true,
          },
        });
        drive.addLabel('departure', 0)
          .fromTo(car, { x: startX }, { x: endX, duration: 1 }, 0)
          .fromTo(trail, { scaleX: (startX + frontOffset) / width }, { scaleX: (endX + frontOffset) / width, duration: 1 }, 0)
          .fromTo(hint, { opacity: 0.65 }, { opacity: 0, duration: 0.06 }, 0)
          .addLabel('arrival', 1);

        cards.forEach((card, index) => {
          const { start, end } = metricStages[index];
          drive.addLabel(`metric-${index + 1}`, start)
            .fromTo(card, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: end - start }, start);
        });
        drive.scrollTrigger.refresh();
        // Explicitly restore the playhead after a rebuild, including zero progress.
        const trigger = drive.scrollTrigger;
        trigger.scroll(scroll);
        const progress = gsap.utils.clamp(0, 1, (scroll - trigger.start) / (trigger.end - trigger.start));
        drive.progress(progress);
        reveal(progress);
      };

      build();
      // Refresh changes geometry; rebuilding also recomputes the mask and motion bounds.
      // Schedule outside ScrollTrigger's refresh callback to avoid recursive refreshes.
      const onRefresh = () => {
        cancelAnimationFrame(refreshFrame);
        refreshFrame = requestAnimationFrame(() => {
          ScrollTrigger.removeEventListener('refresh', onRefresh);
          build();
          ScrollTrigger.addEventListener('refresh', onRefresh);
        });
      };
      ScrollTrigger.addEventListener('refresh', onRefresh);

      const restore = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            // An empty React root can be shorter than the saved scroll offset while
            // a reload is booting. Restore after layout instead of losing that position.
            const targetScroll = !restored && Number.isFinite(savedScroll) && savedScroll !== null
              ? savedScroll : window.scrollY;
            restored = true;
            ScrollTrigger.refresh();
            // Use the trigger's scroll setter so GSAP's cached scroll coordinate is
            // updated too; a raw scrollTo before refresh can be reset to its old cache.
            const trigger = drive.scrollTrigger;
            trigger.scroll(targetScroll);
            ScrollTrigger.update();
            drive.progress(gsap.utils.clamp(0, 1, (targetScroll - trigger.start) / (trigger.end - trigger.start)));
            if (!introDecided) {
              introDecided = true;
              if (targetScroll > 0) finishIntro();
              else intro.play();
            }
          });
        });
      };
      window.addEventListener('pageshow', restore);
      window.addEventListener('load', restore);
      window.addEventListener('pagehide', rememberScroll);
      let disposed = false;
      // Local font loading can change the measured headline width after setup.
      document.fonts?.ready.then(() => { if (!disposed) onRefresh(); });
      if (document.readyState === 'complete') restore();

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        cancelAnimationFrame(refreshFrame);
        window.removeEventListener('pageshow', restore);
        window.removeEventListener('load', restore);
        window.removeEventListener('pagehide', rememberScroll);
        ScrollTrigger.removeEventListener('refresh', onRefresh);
        drive?.scrollTrigger?.kill();
        drive?.revert();
        intro.revert();
        // Rebuilt timelines run outside the initial GSAP context callback.
        // Explicitly clear their styles so preference changes/unmount cannot leave stale state.
        gsap.set([car, trail], { clearProps: 'transform' });
        gsap.set(headline, { clearProps: 'clipPath' });
        gsap.set(content, { clearProps: 'opacity,transform' });
        gsap.set(hint, { clearProps: 'opacity' });
        gsap.set(cards, { clearProps: 'opacity,transform' });
      };
    });
  }, root);

  return () => {
    media.revert();
    context.revert();
  };
}
