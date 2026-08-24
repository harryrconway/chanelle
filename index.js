// --- prevent the browser from restoring a mid-page scroll position on reload ---
// Without this, refreshing while scrolled down measures the hero's dock target
// while it's off-screen above the viewport, sending the loading animation flying
// to a wildly wrong position instead of docking neatly into the header.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// --- loading screen: grow "Chanelle" from centered-tiny to its real docked position ---
const loadingTitle = document.getElementById('loading-title');
const heroName = document.querySelector('.hero-name');

// must match #loading-title's animation-duration and the % where the "rise to dock" keyframe starts
const LOADING_DURATION_MS = 3000;
const RISE_START_PERCENT = 0.65;
const RISE_START_MS = LOADING_DURATION_MS * RISE_START_PERCENT;

function startPageReveal() {
  document.body.classList.remove('is-loading');
  document.body.classList.add('content-visible');
}

if (loadingTitle && heroName) {
  document.fonts.ready.then(() => {
    const heroRect = heroName.getBoundingClientRect();
    const dockX = heroRect.left + heroRect.width / 2 - window.innerWidth / 2;
    const dockY = heroRect.top + heroRect.height / 2 - window.innerHeight / 2;
    document.documentElement.style.setProperty('--dock-x', `${dockX}px`);
    document.documentElement.style.setProperty('--dock-y', `${dockY}px`);
    document.body.classList.add('fonts-ready');

    // rest of the page fades in *while* the title is still rising to its dock —
    // it's hidden behind the loading screen's opaque background either way, so by
    // the time the overlay is removed the real page has already faded in to match it
    setTimeout(() => {
      document.body.classList.add('content-visible');
    }, RISE_START_MS);
  });

  loadingTitle.addEventListener('animationend', (event) => {
    if (event.animationName === 'loadingReveal') {
      startPageReveal();
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.remove();
    }
  });
} else {
  startPageReveal();
}

// --- site-wide smooth scrolling ---
// Intercepts wheel input and animates the *real* window scroll position toward it
// (via repeated window.scrollTo calls), rather than faking scroll with a transformed
// wrapper. That keeps position:sticky (the services pin), getBoundingClientRect-based
// measurements, and everything else working exactly as before — only the raw wheel
// input becomes a smoothed, momentum-like glide instead of jumping with each notch.
let smoothTarget = window.scrollY;
let smoothCurrent = window.scrollY;
let smoothRunning = false;

function isScrollLocked() {
  const modal = document.getElementById('contact-modal');
  return document.body.classList.contains('is-loading') || (modal && modal.classList.contains('is-open'));
}

function smoothScrollTick() {
  smoothCurrent += (smoothTarget - smoothCurrent) * 0.1;
  if (Math.abs(smoothTarget - smoothCurrent) < 0.4) {
    smoothCurrent = smoothTarget;
    window.scrollTo({ top: smoothCurrent, left: 0, behavior: 'instant' });
    smoothRunning = false;
    return;
  }
  window.scrollTo({ top: smoothCurrent, left: 0, behavior: 'instant' });
  requestAnimationFrame(smoothScrollTick);
}

window.addEventListener(
  'wheel',
  (event) => {
    if (isScrollLocked()) return;
    event.preventDefault();

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    smoothTarget = Math.min(maxScroll, Math.max(0, smoothTarget + event.deltaY));

    if (!smoothRunning) {
      smoothRunning = true;
      smoothCurrent = window.scrollY;
      requestAnimationFrame(smoothScrollTick);
    }
  },
  { passive: false }
);

// keep the smooth-scroll target in sync when scrolling happens some other way
// (keyboard, scrollbar drag, touch), so the next wheel tick continues from there.
window.addEventListener('scroll', () => {
  if (!smoothRunning) {
    smoothTarget = window.scrollY;
    smoothCurrent = window.scrollY;
  }
});

// --- scroll-linked highlight: words glow white one at a time while scrolling ---
const highlightContainers = document.querySelectorAll('.scroll-highlight');

highlightContainers.forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');
});

const highlightGroups = Array.from(highlightContainers).map((el) => ({
  el,
  words: Array.from(el.querySelectorAll('.word')),
}));

const introHeart = document.getElementById('intro-heart');
const introTextEl = document.querySelector('.intro-text');

function updateHighlight() {
  const start = window.innerHeight * 0.9;
  const end = window.innerHeight * 0.1;

  highlightGroups.forEach(({ el, words }) => {
    const rect = el.getBoundingClientRect();
    let progress = (start - rect.top) / (start - end);
    progress = Math.min(1, Math.max(0, progress));

    if (introHeart && el === introTextEl) {
      // heart glows in step with the text, but stays subtle so the words stay in focus
      introHeart.style.opacity = String(0.03 + progress * 0.14);
    }

    const n = words.length;
    words.forEach((word, i) => {
      let wordProgress = progress * n - i;
      wordProgress = Math.min(1, Math.max(0, wordProgress));

      // dim, muted ink fading up to the full brand magenta as each word activates
      const r = Math.round(43 + (196 - 43) * wordProgress);
      const g = Math.round(20 + (54 - 20) * wordProgress);
      const b = Math.round(32 + (112 - 32) * wordProgress);
      const a = 0.3 + (1 - 0.3) * wordProgress;

      word.style.color = `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
      word.style.textShadow = `0 0 ${Math.round(14 * wordProgress)}px rgba(196, 54, 112, ${(0.45 * wordProgress).toFixed(2)})`;
    });
  });
}

// --- services: pinned viewport, cards step in one at a time as you scroll ---
// Driven by a continuous rAF loop that lerps toward the scroll-derived target every
// frame (not a raw scroll-event binding), so mouse-wheel notches and trackpad input
// both come out as one smooth, gradual glide instead of jumping with the input.
const servicesScroll = document.querySelector('.services-scroll');
const servicesBands = document.querySelectorAll('.services-pin .service-band');

// card 1 is already fully in place the instant the pin engages (its window ends
// at progress 0, not after it), so there's no dead scroll before anything shows.
// cards 2-4 then arrive in turn, leaving a short dwell buffer before the pin releases.
const cardWindows = [
  [-0.08, 0],
  [0, 0.3],
  [0.3, 0.6],
  [0.6, 0.9],
];

let servicesTarget = 0;
let servicesCurrent = 0;

function getServicesTarget() {
  if (!servicesScroll) return 0;
  const rect = servicesScroll.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  const progress = -rect.top / total;
  return Math.min(1, Math.max(0, progress));
}

function renderServices(progress) {
  servicesBands.forEach((band, i) => {
    const [windowStart, windowEnd] = cardWindows[i];
    let t = (progress - windowStart) / (windowEnd - windowStart);
    t = Math.min(1, Math.max(0, t));

    const eased = 1 - Math.pow(1 - t, 3);
    const slideY = (1 - eased) * 60;

    // each card gets its own small entrance quirk, layered on top of the
    // shared slide-up + fade so the core stacking mechanic stays the same.
    let extra = '';
    if (i === 0) {
      // 01: quick tilt-settle
      extra = ` rotate(${(1 - eased) * -3}deg)`;
    } else if (i === 1) {
      // 02: gentle overshoot bounce (back-ease) on scale
      const c1 = 1.70158;
      const c3 = c1 + 1;
      const back = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      extra = ` scale(${(0.9 + back * 0.1).toFixed(4)})`;
    } else if (i === 2) {
      // 03: playful side-to-side wiggle that dampens out as it settles
      const wiggle = Math.sin(t * Math.PI * 3) * (1 - t) * 12;
      extra = ` translateX(${wiggle.toFixed(2)}px)`;
    } else if (i === 3) {
      // 04: tilt from the opposite direction with a subtle scale pop
      extra = ` rotate(${(1 - eased) * 3}deg) scale(${(0.96 + eased * 0.04).toFixed(4)})`;
    }

    band.style.transform = `translateY(${slideY}vh)${extra}`;
    band.style.opacity = String(eased);
  });
}

function servicesLoop() {
  servicesTarget = getServicesTarget();
  servicesCurrent += (servicesTarget - servicesCurrent) * 0.09;
  if (Math.abs(servicesTarget - servicesCurrent) < 0.0004) servicesCurrent = servicesTarget;
  renderServices(servicesCurrent);
  requestAnimationFrame(servicesLoop);
}

if (servicesScroll && servicesBands.length) {
  requestAnimationFrame(servicesLoop);
}

let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(() => {
      updateHighlight();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
});

updateHighlight();

// --- seamless marquee: duplicate the track content once ---
const marqueeTrack = document.getElementById('marquee-track');
if (marqueeTrack) {
  marqueeTrack.innerHTML += marqueeTrack.innerHTML;
}

// --- scroll-triggered reveal for sections below the fold ---
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        sectionObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll('.reveal-section').forEach((el) => sectionObserver.observe(el));

// --- "She's Social" hover: tiny hearts spam from the cursor ---
(function setupShesSocialHeartSpam() {
  const link = document.querySelector('.shes-social-link');
  const banner = document.querySelector('.shes-social-banner');
  if (!link || !banner) return;

  const HEART_PATH = 'M16 29S1 19.5 1 9.7C1 4.3 5 1 9.4 1c3 0 5.4 1.6 6.6 4 1.2-2.4 3.6-4 6.6-4C27 1 31 4.3 31 9.7 31 19.5 16 29 16 29Z';
  const SPAWN_INTERVAL_MS = 220;
  let lastSpawn = 0;

  link.addEventListener('mousemove', (event) => {
    const now = performance.now();
    if (now - lastSpawn < SPAWN_INTERVAL_MS) return;
    lastSpawn = now;

    const bannerRect = banner.getBoundingClientRect();
    const x = event.clientX - bannerRect.left;
    const y = event.clientY - bannerRect.top;

    const heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    heart.setAttribute('viewBox', '0 0 32 29');
    heart.classList.add('ss-spam-heart');
    heart.style.left = `${x}px`;
    heart.style.top = `${y}px`;
    heart.style.setProperty('--spam-rot', `${(Math.random() * 60 - 30).toFixed(1)}deg`);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', HEART_PATH);
    heart.appendChild(path);

    banner.appendChild(heart);
    heart.addEventListener('animationend', () => heart.remove());
  });
})();

// --- footer pills: real gravity + collision physics, not a fixed CSS curve ---
// Each one drops from its own column, hits the floor, and can bump into its
// neighbors as it settles — but always rights itself flat and horizontal so
// the text stays readable, rather than resting on its side.
(function setupPillPhysics() {
  const socialLinks = document.querySelector('.social-links');
  const pillEls = Array.from(document.querySelectorAll('.social-pill'));
  if (!socialLinks || !pillEls.length) return;

  let started = false;

  function start() {
    if (started) return;
    started = true;

    const containerRect = socialLinks.getBoundingClientRect();
    const laneWidth = containerRect.width / pillEls.length;
    const siteFooter = socialLinks.closest('.site-footer');
    const footerRect = siteFooter ? siteFooter.getBoundingClientRect() : containerRect;
    const FOOTER_BOTTOM_GAP = 16; // breathing room from the footer's inner edge

    const COLLISION_PAD = 10; // keeps a visible gap between pills, not just edge-touching

    const pills = pillEls.map((el, i) => {
      const rect = el.getBoundingClientRect();
      const naturalX = rect.left - containerRect.left;
      const naturalY = rect.top - containerRect.top;
      const laneCenterX = i * laneWidth + laneWidth / 2;
      // every pill falls all the way to the footer's own bottom edge, not just
      // to wherever it happened to sit in the normal document flow
      const floorY = footerRect.bottom - containerRect.top - FOOTER_BOTTOM_GAP - rect.height;
      return {
        el,
        w: rect.width,
        h: rect.height,
        naturalX,
        naturalY,
        floorY,
        x: laneCenterX - rect.width / 2,
        y: naturalY - 620 - i * 150,
        vx: (Math.random() * 2 - 1) * 0.4,
        vy: 0,
        angle: (Math.random() * 2 - 1) * 6,
        angularVel: (Math.random() * 2 - 1) * 1.2,
      };
    });

    pills.forEach((p) => { p.el.style.opacity = '1'; });

    const gravity = 0.22; // slow, gentle fall
    let frame = 0;
    const maxFrames = 600;

    function settled() {
      return pills.every((p) => {
        const norm = normalizeAngle(p.angle);
        const distFromFlat = norm > 180 ? 360 - norm : norm;
        return Math.abs(p.vy) < 0.15 && Math.abs(p.vx) < 0.15 && distFromFlat < 6;
      });
    }

    const MAX_SPEED = 14;
    const MAX_ANGULAR = 6;
    const FRICTION = 0.985; // per-frame damping so energy actually dissipates

    function clamp(v, max) {
      return Math.max(-max, Math.min(max, v));
    }

    // 0-360, so "how far this angle has spun past however many full turns"
    function normalizeAngle(a) {
      const n = a % 360;
      return n < 0 ? n + 360 : n;
    }

    function tick() {
      frame++;

      pills.forEach((p) => {
        p.vy += gravity;
        p.vx *= FRICTION;
        p.angularVel *= FRICTION;
        p.vx = clamp(p.vx, MAX_SPEED);
        p.vy = clamp(p.vy, MAX_SPEED);
        p.angularVel = clamp(p.angularVel, MAX_ANGULAR);

        // once a pill is nearly at rest, right it flat and horizontal instead of
        // letting it settle on an angle — a gentle pendulum-style restoring pull
        // toward 0deg (its readable orientation), strongest the further it's tilted
        if (Math.abs(p.angularVel) < 2.5) {
          const rad = (p.angle * Math.PI) / 180;
          p.angularVel += -Math.sin(rad) * 0.4;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.angularVel;

        if (p.y > p.floorY) {
          p.y = p.floorY;
          p.vy *= -0.4;
          p.vx *= 0.8;
          p.angularVel *= 0.5;
          if (Math.abs(p.vy) < 0.8) p.vy = 0;
        }

        if (p.w >= containerRect.width) {
          // wider than its own container — pin to the left edge so the text stays on screen
          p.x = 0;
        } else {
          if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
          const maxX = containerRect.width - p.w;
          if (p.x > maxX) { p.x = maxX; p.vx *= -0.5; }
        }
      });

      // resolve collisions a couple of times per frame so overlapping pairs
      // separate quickly instead of re-triggering a fresh impulse every frame.
      // pills are wide, flat rectangles (not compact blobs), so real
      // rectangle-vs-rectangle overlap is used instead of a circle approximation —
      // a circle sized to the shorter edge let the labels overlap and become unreadable
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < pills.length; i++) {
          for (let j = i + 1; j < pills.length; j++) {
            const a = pills[i];
            const b = pills[j];
            const aLeft = a.x - COLLISION_PAD / 2;
            const aRight = a.x + a.w + COLLISION_PAD / 2;
            const aTop = a.y - COLLISION_PAD / 2;
            const aBottom = a.y + a.h + COLLISION_PAD / 2;
            const bLeft = b.x - COLLISION_PAD / 2;
            const bRight = b.x + b.w + COLLISION_PAD / 2;
            const bTop = b.y - COLLISION_PAD / 2;
            const bBottom = b.y + b.h + COLLISION_PAD / 2;

            const overlapX = Math.min(aRight, bRight) - Math.max(aLeft, bLeft);
            const overlapY = Math.min(aBottom, bBottom) - Math.max(aTop, bTop);

            if (overlapX > 0 && overlapY > 0) {
              const aCenterX = a.x + a.w / 2;
              const aCenterY = a.y + a.h / 2;
              const bCenterX = b.x + b.w / 2;
              const bCenterY = b.y + b.h / 2;

              // push apart along whichever axis needs the least movement to separate
              let nx = 0;
              let ny = 0;
              let push = 0;
              if (overlapX < overlapY) {
                nx = aCenterX < bCenterX ? -1 : 1;
                push = overlapX / 2;
              } else {
                ny = aCenterY < bCenterY ? -1 : 1;
                push = overlapY / 2;
              }

              a.x += nx * push;
              a.y += ny * push;
              b.x -= nx * push;
              b.y -= ny * push;

              const relVx = b.vx - a.vx;
              const relVy = b.vy - a.vy;
              const rel = relVx * nx + relVy * ny;
              if (rel < 0) {
                const impulse = -rel * 0.5;
                a.vx -= impulse * nx;
                a.vy -= impulse * ny;
                b.vx += impulse * nx;
                b.vy += impulse * ny;
                const spin = clamp(impulse * 0.4, 1.5);
                a.angularVel -= spin;
                b.angularVel += spin;
              }
            }
          }
        }
      }

      // hard cutoff is about to hit — guarantee every pill ends up flat and readable
      if (frame >= maxFrames) {
        pills.forEach((p) => {
          const norm = normalizeAngle(p.angle);
          const delta = norm > 180 ? norm - 360 : norm;
          p.angle -= delta;
          p.angularVel = 0;
        });
      }

      pills.forEach((p) => {
        p.el.style.transform = `translate(${p.x - p.naturalX}px, ${p.y - p.naturalY}px) rotate(${p.angle}deg)`;
      });

      if (frame < maxFrames && !(frame > 90 && settled())) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  const pillObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          start();
          pillObserver.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );
  pillObserver.observe(socialLinks);
})();

// --- footer live clock ---
const clockEl = document.getElementById('footer-clock');

function updateClock() {
  if (!clockEl) return;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Australia/Brisbane',
    hour: '2-digit',
    minute: '2-digit',
  });
  clockEl.textContent = formatter.format(new Date());
}

updateClock();
setInterval(updateClock, 15000);

// --- contact modal ---
const contactModal = document.getElementById('contact-modal');
const openContactBtn = document.getElementById('open-contact');
const openContactFixedBtn = document.getElementById('open-contact-fixed');
const closeContactBtn = document.getElementById('close-contact');

function openModal() {
  contactModal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  contactModal.classList.remove('is-open');
  document.body.style.overflow = '';
}

if (openContactBtn) openContactBtn.addEventListener('click', openModal);
if (openContactFixedBtn) openContactFixedBtn.addEventListener('click', openModal);
if (closeContactBtn) closeContactBtn.addEventListener('click', closeModal);
if (contactModal) {
  contactModal.addEventListener('click', (event) => {
    if (event.target === contactModal) closeModal();
  });
}

// --- keep the fixed contact button pinned to the viewport, but park it right at the
// footer's bottom edge instead of letting it overlap past the footer while scrolling ---
const siteFooter = document.querySelector('.site-footer');
if (openContactFixedBtn && siteFooter) {
  const BTN_GAP = 28;

  function updateFixedBtnPosition() {
    const footerRect = siteFooter.getBoundingClientRect();
    const btnHeight = openContactFixedBtn.offsetHeight;
    const fixedBtnTop = window.innerHeight - BTN_GAP - btnHeight;

    if (footerRect.bottom < fixedBtnTop + btnHeight) {
      const parkedTop = footerRect.bottom + window.scrollY - btnHeight - BTN_GAP;
      openContactFixedBtn.style.position = 'absolute';
      openContactFixedBtn.style.top = `${parkedTop}px`;
      openContactFixedBtn.style.bottom = 'auto';
    } else {
      openContactFixedBtn.style.position = 'fixed';
      openContactFixedBtn.style.top = 'auto';
      openContactFixedBtn.style.bottom = `${BTN_GAP}px`;
    }
  }

  window.addEventListener('scroll', updateFixedBtnPosition, { passive: true });
  window.addEventListener('resize', updateFixedBtnPosition);
  updateFixedBtnPosition();
}

// --- tag-pill selectors inside the contact form ---
document.querySelectorAll('.tag-row-select').forEach((row) => {
  const singleSelect = row.dataset.single === 'true';
  row.querySelectorAll('.tag-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (singleSelect) {
        row.querySelectorAll('.tag-option').forEach((b) => b.classList.remove('is-selected'));
      }
      btn.classList.toggle('is-selected');
    });
  });
});

// --- form submit placeholder ---
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    contactForm.reset();
    document.querySelectorAll('.tag-option.is-selected').forEach((b) => b.classList.remove('is-selected'));
    alert('Practice form only — no backend connected.');
    closeModal();
  });
}
