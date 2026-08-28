(function setupStoryScroll() {
  const scrollSection = document.querySelector('.ss-story-scroll');
  const pin = document.querySelector('.ss-story-pin');
  const circlePink = document.querySelector('.ss-hero-circle');
  const circleBlue = document.querySelector('.ss-circle-blue');
  const heading = document.querySelector('.ss-hero-text');
  const intro = document.querySelector('.ss-hero-intro');
  const introHearts = document.querySelectorAll('.ss-hero-intro-hearts .heart');
  const briefLeft = document.querySelector('.ss-brief-left');
  const briefLeftHearts = document.querySelectorAll('.ss-brief-left .heart');
  const briefRight = document.querySelector('.ss-brief-right');
  const briefRightHearts = document.querySelectorAll('.ss-brief-right .heart');
  const calendar = document.querySelector('.ss-cal-chapter');

  if (!scrollSection || !pin || !circlePink || !circleBlue || !heading || !intro || !briefLeft || !briefRight || !calendar) return;

  const BASE_SIZE = 140; // must match both circles' width/height in shes-social.css
  const FADE_STOP = 0.7; // must match both circles' radial-gradient transparent stop
  const HEADING_MAX_SCALE = 1.45;
  const SLIDE_DISTANCE = 40; // px, shared entrance/exit slide for briefs
  const INTRO_HEART_ROTATIONS = [-12, 14, -8];
  const LEFT_HEART_ROTATIONS = [-10, 12];
  const RIGHT_HEART_ROTATIONS = [10, -14];

  // Phase windows as fractions of total scroll progress (0-1). Boundaries
  // deliberately overlap a few percent at chapter hand-offs so the incoming
  // chapter is already cross-fading in while the outgoing one finishes.
  const P = {
    circleGrow: [0, 0.075],
    headingDock: [0.06, 0.15],
    introIn: [0.14, 0.22],
    introOut: [0.28, 0.34],
    leftIn: [0.31, 0.37],
    leftOut: [0.46, 0.51],
    blueGrow: [0.48, 0.6],
    rightIn: [0.57, 0.63],
    rightOut: [0.72, 0.77],
    calIn: [0.75, 0.81],
  };

  let dockDistance = 0;
  let target = 0;
  let current = 0;

  function mapRange(value, start, end) {
    if (end === start) return value >= end ? 1 : 0;
    return Math.min(Math.max((value - start) / (end - start), 0), 1);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInCubic(t) {
    return Math.pow(t, 3);
  }

  // Fade in (ease-out) -> hold at 1 -> fade out (ease-in) -> 0. Pass
  // outStart/outEnd >= 1 for a chapter that should just hold once it arrives.
  function fadeWindow(progress, inStart, inEnd, outStart, outEnd) {
    if (progress <= inStart) return 0;
    if (progress < inEnd) return easeOutCubic(mapRange(progress, inStart, inEnd));
    if (progress <= outStart) return 1;
    if (progress < outEnd) return 1 - easeInCubic(mapRange(progress, outStart, outEnd));
    return 0;
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
    // Circles: both share one viewport-covering target scale.
    const targetDiameter = Math.hypot(window.innerWidth, window.innerHeight) * 1.15;
    const maxScale = targetDiameter / (BASE_SIZE * FADE_STOP);

    const pinkGrow = mapRange(progress, P.circleGrow[0], P.circleGrow[1]);
    circlePink.style.setProperty('--circle-scale', (1 + (maxScale - 1) * pinkGrow).toFixed(3));

    const blueGrow = mapRange(progress, P.blueGrow[0], P.blueGrow[1]);
    circleBlue.style.setProperty('--circle-scale-blue', (1 + (maxScale - 1) * blueGrow).toFixed(3));

    // Heading: grows and docks to the top.
    const dock = mapRange(progress, P.headingDock[0], P.headingDock[1]);
    heading.style.transform = `translateY(${(dockDistance * dock).toFixed(1)}px) scale(${(1 + (HEADING_MAX_SCALE - 1) * dock).toFixed(3)})`;

    // Intro: fade in, hold, fade out.
    const introEased = fadeWindow(progress, P.introIn[0], P.introIn[1], P.introOut[0], P.introOut[1]);
    intro.style.opacity = introEased.toFixed(3);
    intro.style.transform = `translateY(${(24 * (1 - introEased)).toFixed(1)}px)`;
    introHearts.forEach((heart, i) => {
      const t = mapRange(introEased, i * 0.1, 1);
      heart.style.opacity = (t * 0.85).toFixed(3);
      heart.style.transform = `scale(${(0.3 + 0.7 * t).toFixed(3)}) rotate(${INTRO_HEART_ROTATIONS[i] || 0}deg)`;
    });

    // Left brief: fade in, hold, fade out; slides in from the left.
    const leftEased = fadeWindow(progress, P.leftIn[0], P.leftIn[1], P.leftOut[0], P.leftOut[1]);
    briefLeft.style.opacity = leftEased.toFixed(3);
    briefLeft.style.transform = `translate(0, -50%) translateX(${(-SLIDE_DISTANCE * (1 - leftEased)).toFixed(1)}px)`;
    briefLeftHearts.forEach((heart, i) => {
      const t = mapRange(leftEased, i * 0.15, 1);
      heart.style.opacity = (t * 0.85).toFixed(3);
      heart.style.transform = `scale(${(0.3 + 0.7 * t).toFixed(3)}) rotate(${LEFT_HEART_ROTATIONS[i] || 0}deg)`;
    });

    // Right brief: fade in, hold, fade out; slides in from the right.
    const rightEased = fadeWindow(progress, P.rightIn[0], P.rightIn[1], P.rightOut[0], P.rightOut[1]);
    briefRight.style.opacity = rightEased.toFixed(3);
    briefRight.style.transform = `translate(0, -50%) translateX(${(SLIDE_DISTANCE * (1 - rightEased)).toFixed(1)}px)`;
    briefRightHearts.forEach((heart, i) => {
      const t = mapRange(rightEased, i * 0.15, 1);
      heart.style.opacity = (t * 0.85).toFixed(3);
      heart.style.transform = `scale(${(0.3 + 0.7 * t).toFixed(3)}) rotate(${RIGHT_HEART_ROTATIONS[i] || 0}deg)`;
    });

    // Calendar: fades in, then holds through the rest of the scroll.
    const calEased = fadeWindow(progress, P.calIn[0], P.calIn[1], 1, 1);
    calendar.style.opacity = calEased.toFixed(3);
    calendar.style.transform = `translateY(${(24 * (1 - calEased)).toFixed(1)}px)`;
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
