(function setupHeroCircle() {
  const scrollSection = document.querySelector('.ss-hero-scroll');
  const circle = document.querySelector('.ss-hero-circle');
  if (!scrollSection || !circle) return;

  const BASE_SIZE = 140; // must match .ss-hero-circle's width/height in shes-social.css
  const FADE_STOP = 0.7; // must match the radial-gradient's transparent stop in shes-social.css —
                          // the visible pink only reaches this fraction of the circle's own radius,
                          // so scale has to target that, not the full (partly-invisible) box

  function update() {
    const scrollableDistance = scrollSection.offsetHeight - window.innerHeight;
    if (scrollableDistance <= 0) return;

    const scrolled = -scrollSection.getBoundingClientRect().top;
    const progress = Math.min(Math.max(scrolled / scrollableDistance, 0), 1);

    const targetDiameter = Math.hypot(window.innerWidth, window.innerHeight) * 1.15;
    const maxScale = targetDiameter / (BASE_SIZE * FADE_STOP);
    const scale = 1 + (maxScale - 1) * progress;

    circle.style.setProperty('--circle-scale', scale.toFixed(3));
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
