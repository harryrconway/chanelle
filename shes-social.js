(function setupStoryScroll() {
  const scrollSection = document.querySelector('.ss-story-scroll');
  const pin = document.querySelector('.ss-story-pin');
  const heading = document.querySelector('.ss-hero-text');
  const finaleWrap = document.querySelector('.ss-finale-wrap');
  const finaleShimmer = document.querySelector('.ss-finale-shimmer');

  if (!scrollSection || !pin || !heading || !finaleWrap || !finaleShimmer) return;

  const BASE_SIZE = 140; // must match .ss-finale-wrap's width/height in shes-social.css
  const FADE_STOP = 0.7; // must match .ss-finale-base's radial-gradient transparent stop
  const HEADING_MAX_SCALE = 1.45;
  const BLUE_RGB = [158, 220, 245]; // must match --page-bg (#9edcf5) in index.css
  const PINK_RGB = [253, 150, 205]; // must match --card-pink (#fd96cd) in index.css

  // Phase windows as fractions of total scroll progress (0-1).
  const P = {
    headingDock: [0, 0.2],
    finaleGrow: [0.3, 0.7],
    finaleShift: [0.55, 0.9],
  };

  let dockDistance = 0;
  let target = 0;
  let current = 0;

  function mapRange(value, start, end) {
    if (end === start) return value >= end ? 1 : 0;
    return Math.min(Math.max((value - start) / (end - start), 0), 1);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Measures how far the heading needs to travel to sit near the top of the
  // pinned viewport, using its natural (undocked) centered position — done
  // once (and on resize), then reused every frame rather than re-measured
  // mid-transform.
  function measureDock() {
    heading.style.transform = '';
    const pinRect = pin.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const targetTop = pinRect.top + window.innerHeight * 0.1;
    dockDistance = targetTop - headingRect.top;
  }

  function getTarget() {
    const scrollable = scrollSection.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    const scrolled = -scrollSection.getBoundingClientRect().top;
    return Math.min(Math.max(scrolled / scrollable, 0), 1);
  }

  function render(progress) {
    // Heading: grows and docks to the top.
    const dock = mapRange(progress, P.headingDock[0], P.headingDock[1]);
    heading.style.transform = `translateY(${(dockDistance * dock).toFixed(1)}px) scale(${(1 + (HEADING_MAX_SCALE - 1) * dock).toFixed(3)})`;

    // Finale: one disc grows to cover the screen while its own color lerps
    // from blue to pink, plus a continuously (non-scroll-driven) rotating
    // shimmer highlight layered on top so it keeps moving even at rest.
    const targetDiameter = Math.hypot(window.innerWidth, window.innerHeight) * 1.15;
    const maxScale = targetDiameter / (BASE_SIZE * FADE_STOP);

    const grow = mapRange(progress, P.finaleGrow[0], P.finaleGrow[1]);
    finaleWrap.style.setProperty('--finale-scale', (1 + (maxScale - 1) * grow).toFixed(3));
    finaleShimmer.style.opacity = (grow * 0.9).toFixed(3);

    const shift = easeInOutCubic(mapRange(progress, P.finaleShift[0], P.finaleShift[1]));
    const r = Math.round(BLUE_RGB[0] + (PINK_RGB[0] - BLUE_RGB[0]) * shift);
    const g = Math.round(BLUE_RGB[1] + (PINK_RGB[1] - BLUE_RGB[1]) * shift);
    const b = Math.round(BLUE_RGB[2] + (PINK_RGB[2] - BLUE_RGB[2]) * shift);
    finaleWrap.style.setProperty('--finale-rgb', `${r}, ${g}, ${b}`);
  }

  function loop() {
    target = getTarget();
    current += (target - current) * 0.09;
    if (Math.abs(target - current) < 0.0004) current = target;
    render(current);
    requestAnimationFrame(loop);
  }

  measureDock();
  requestAnimationFrame(loop);

  window.addEventListener('resize', measureDock);
})();
