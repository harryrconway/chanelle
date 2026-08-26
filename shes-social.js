(function setupYearOverview() {
  const CURRENT_MONTH_INDEX = new Date().getMonth();
  const CALENDAR_YEAR = new Date().getFullYear();

  // Placeholder events only — swap for real event data when the client
  // provides it. One per month keeps the numbered pairing between the
  // description column and the month card simple (badge N === month N).
  const YEAR_EVENTS = [
    { month: 'January',   title: 'Coffee & Connection meetup', blurb: 'A relaxed coffee morning to kick off the year and catch up with the group.' },
    { month: 'February',  title: "Galentine's catch-up",        blurb: 'A celebration of friendship and self-love, with treats and good company all round.' },
    { month: 'March',     title: 'Monthly mixer',                blurb: 'Our regular evening mixer, the easiest way to meet new faces in the group.' },
    { month: 'April',     title: 'Wellness walk',                blurb: 'A gentle group walk and chat, because moving together beats moving alone.' },
    { month: 'May',       title: 'Coffee & Connection meetup',   blurb: 'Another cosy coffee catch-up to check in before the weather turns.' },
    { month: 'June',      title: 'Winter warmer social',         blurb: 'A cosy indoor get-together with warm drinks and even warmer conversation.' },
    { month: 'July',      title: 'Book club brunch',             blurb: "A laid-back brunch to swap recommendations and talk about what we've been reading." },
    { month: 'August',    title: 'Monthly mixer',                blurb: 'Our midwinter mixer, a chance to unwind and welcome new members.' },
    { month: 'September', title: 'Sunset walk & chat',           blurb: 'An easy evening walk to welcome the warmer evenings, finished off with a chat.' },
    { month: 'October',   title: 'Spring social mixer',          blurb: "A seasonal mixer to celebrate the warmer weather and the group's newest members." },
    { month: 'November',  title: 'Paint & sip evening',          blurb: 'A relaxed creative night with paints, prosecco, and plenty of laughs.' },
    { month: 'December',  title: 'End of year celebration',      blurb: 'A festive get-together to toast the year and everyone who made it special.' },
  ];

  function buildCardRow(item, index) {
    const li = document.createElement('li');
    li.className = 'ss-cal-card-row';
    const isCurrent = index === CURRENT_MONTH_INDEX;
    if (isCurrent) li.classList.add('is-current-month');

    const badge = document.createElement('span');
    badge.className = 'ss-cal-badge';
    if (isCurrent) badge.classList.add('is-current-month');
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = String(index + 1);

    const month = document.createElement('span');
    month.className = 'ss-cal-card-month';
    month.textContent = item.month.slice(0, 3);

    const text = document.createElement('span');
    text.className = 'ss-cal-card-text';
    text.textContent = item.title;

    li.append(badge, month, text);
    return li;
  }

  function buildDetailBlock(item, index) {
    const article = document.createElement('article');
    article.className = 'ss-cal-detail';
    const isCurrent = index === CURRENT_MONTH_INDEX;
    if (isCurrent) article.classList.add('is-current-month');

    const head = document.createElement('div');
    head.className = 'ss-cal-detail-head';

    const badge = document.createElement('span');
    badge.className = 'ss-cal-badge';
    if (isCurrent) badge.classList.add('is-current-month');
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = String(index + 1);

    const title = document.createElement('h3');
    title.className = 'ss-cal-detail-title';
    title.textContent = `${item.month} — ${item.title}`;

    head.append(badge, title);

    const blurb = document.createElement('p');
    blurb.className = 'ss-cal-detail-text';
    blurb.textContent = item.blurb;

    article.append(head, blurb);
    return article;
  }

  function render() {
    const details = document.getElementById('ss-cal-details');
    const cardList = document.getElementById('ss-cal-card-list');
    const yearLabel = document.getElementById('cal-year-label');
    if (!details || !cardList) return;

    if (yearLabel) yearLabel.textContent = `${CALENDAR_YEAR} Calendar`;

    const detailFragment = document.createDocumentFragment();
    const cardFragment = document.createDocumentFragment();

    YEAR_EVENTS.forEach((item, index) => {
      detailFragment.appendChild(buildDetailBlock(item, index));
      cardFragment.appendChild(buildCardRow(item, index));
    });

    details.appendChild(detailFragment);
    cardList.appendChild(cardFragment);
  }

  render();
})();

// --- scroll-triggered reveal for sections on this page (same pattern as index.js) ---
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
