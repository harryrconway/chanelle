(function setupHeroScroll() {
  const scrollSection = document.querySelector('.ss-hero-scroll');
  const pin = document.querySelector('.ss-hero-pin');
  const circle = document.querySelector('.ss-hero-circle');
  const heading = document.querySelector('.ss-hero-text');
  const intro = document.querySelector('.ss-hero-intro');
  const hearts = document.querySelectorAll('.ss-hero-intro-hearts .heart');
  if (!scrollSection || !pin || !circle || !heading || !intro) return;

  const BASE_SIZE = 140; // must match .ss-hero-circle's width/height in shes-social.css
  const FADE_STOP = 0.7; // must match the radial-gradient's transparent stop in shes-social.css —
                          // the visible pink only reaches this fraction of the circle's own radius,
                          // so scale has to target that, not the full (partly-invisible) box
  const HEADING_MAX_SCALE = 1.45;
  const HEART_ROTATIONS = [-12, 14, -8]; // matches this site's small-scatter heart convention

  let dockDistance = 0;

  function mapRange(value, start, end) {
    if (end === start) return value >= end ? 1 : 0;
    return Math.min(Math.max((value - start) / (end - start), 0), 1);
  }

  // Measures how far the heading needs to travel to sit near the top of the
  // pinned viewport, using its natural (undocked) centered position — done
  // once (and on resize), then reused every scroll tick rather than
  // re-measured mid-transform.
  function measureDock() {
    heading.style.transform = '';
    const pinRect = pin.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const targetTop = pinRect.top + window.innerHeight * 0.1;
    dockDistance = targetTop - headingRect.top;
  }

  function update() {
    const scrollableDistance = scrollSection.offsetHeight - window.innerHeight;
    if (scrollableDistance <= 0) return;

    const scrolled = -scrollSection.getBoundingClientRect().top;
    const progress = Math.min(Math.max(scrolled / scrollableDistance, 0), 1);

    // Phase 1 (0–30%): the circle grows to cover the screen.
    const circleProgress = mapRange(progress, 0, 0.3);
    const targetDiameter = Math.hypot(window.innerWidth, window.innerHeight) * 1.15;
    const maxScale = targetDiameter / (BASE_SIZE * FADE_STOP);
    const circleScale = 1 + (maxScale - 1) * circleProgress;
    circle.style.setProperty('--circle-scale', circleScale.toFixed(3));

    // Phase 2 (25–60%): the heading grows and docks to the top.
    const dockProgress = mapRange(progress, 0.25, 0.6);
    const headingScale = 1 + (HEADING_MAX_SCALE - 1) * dockProgress;
    const headingY = dockDistance * dockProgress;
    heading.style.transform = `translateY(${headingY.toFixed(1)}px) scale(${headingScale.toFixed(3)})`;

    // Phase 3 (55–100%): the intro paragraph and hearts fade in.
    const introProgress = mapRange(progress, 0.55, 1);
    intro.style.opacity = introProgress.toFixed(3);
    intro.style.transform = `translateY(${(24 * (1 - introProgress)).toFixed(1)}px)`;

    hearts.forEach((heart, i) => {
      const heartProgress = mapRange(introProgress, i * 0.1, 1);
      heart.style.opacity = (heartProgress * 0.85).toFixed(3);
      const scale = 0.3 + 0.7 * heartProgress;
      heart.style.transform = `scale(${scale.toFixed(3)}) rotate(${HEART_ROTATIONS[i] || 0}deg)`;
    });
  }

  measureDock();
  update();

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => {
    measureDock();
    update();
  });
})();
