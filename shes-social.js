(function setupYearOverview() {
  const CURRENT_MONTH_INDEX = new Date().getMonth();
  const CALENDAR_YEAR = new Date().getFullYear();

  // Placeholder events only — swap for real event data when the client
  // provides it. One per month keeps the numbered pairing between the
  // description column and the month card simple (badge N === month N).
  const YEAR_EVENTS = [
    { month: 'January',   title: 'Coffee & Connection meetup', blurb: 'A relaxed coffee morning to kick off the year.' },
    { month: 'February',  title: "Galentine's catch-up",        blurb: 'Celebrating friendship and self-love with treats and good company.' },
    { month: 'March',     title: 'Monthly mixer',                blurb: 'An easy evening mixer to meet new faces.' },
    { month: 'April',     title: 'Wellness walk',                blurb: 'A gentle group walk, because moving together beats moving alone.' },
    { month: 'May',       title: 'Coffee & Connection meetup',   blurb: 'A cosy coffee catch-up before the weather turns.' },
    { month: 'June',      title: 'Winter warmer social',         blurb: 'Warm drinks and even warmer conversation, indoors.' },
    { month: 'July',      title: 'Book club brunch',             blurb: 'A laid-back brunch to swap book recommendations.' },
    { month: 'August',    title: 'Monthly mixer',                blurb: 'A midwinter mixer to unwind and meet new members.' },
    { month: 'September', title: 'Sunset walk & chat',           blurb: 'An easy evening walk to welcome the warmer nights.' },
    { month: 'October',   title: 'Spring social mixer',          blurb: 'Celebrating warmer weather and our newest members.' },
    { month: 'November',  title: 'Paint & sip evening',          blurb: 'A relaxed creative night with paints, prosecco, and laughs.' },
    { month: 'December',  title: 'End of year celebration',      blurb: 'A festive toast to the year and everyone in it.' },
  ];

  function buildCardRow(item, index) {
    const li = document.createElement('li');
    li.className = 'ss-cal-card-row';
    const isCurrent = index === CURRENT_MONTH_INDEX;
    if (isCurrent) li.classList.add('is-current-month');

    const head = document.createElement('span');
    head.className = 'ss-cal-card-head';

    const badge = document.createElement('span');
    badge.className = 'ss-cal-badge';
    if (isCurrent) badge.classList.add('is-current-month');
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = String(index + 1);

    const month = document.createElement('span');
    month.className = 'ss-cal-card-month';
    month.textContent = item.month.slice(0, 3);

    head.append(badge, month);

    const text = document.createElement('span');
    text.className = 'ss-cal-card-text';
    text.textContent = item.title;

    li.append(head, text);
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