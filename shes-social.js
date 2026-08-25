(function setupYearCalendar() {
  const TODAY = new Date();
  const CALENDAR_YEAR = TODAY.getFullYear();

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const BAND_CLASSES = [
    'band-pink', 'band-teal', 'band-green',
    'band-yellow', 'band-lavender', 'band-peach'
  ];

  // Placeholder events only — swap for real event data when the client
  // provides it. Keyed by "MM-DD" (not a full date) so the calendar stays
  // evergreen and "recurs" every year without manual date bumps.
  const PLACEHOLDER_EVENTS = {
    '01-10': "Coffee & Connection meetup",
    '01-24': "Sunset walk & chat",
    '02-07': "Monthly mixer",
    '02-14': "Galentine's catch-up",
    '03-14': "Coffee & Connection meetup",
    '04-11': "Wellness walk",
    '05-09': "Monthly mixer",
    '06-13': "Coffee & Connection meetup",
    '07-11': "Winter warmer social",
    '08-08': "Monthly mixer",
    '09-12': "Coffee & Connection meetup",
    '10-10': "Spring social mixer",
    '11-14': "Coffee & Connection meetup",
    '12-05': "End of year celebration",
  };

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function buildMonthCard(year, monthIndex) {
    const card = document.createElement('article');
    const bandClass = BAND_CLASSES[monthIndex % BAND_CLASSES.length];
    card.className = `month-card ${bandClass}`;
    card.style.setProperty('--reveal-delay', `${(monthIndex % 4) * 0.08}s`);

    const isCurrentMonth =
      year === TODAY.getFullYear() && monthIndex === TODAY.getMonth();
    if (isCurrentMonth) card.classList.add('is-current-month');

    const header = document.createElement('header');
    header.className = 'month-card-header';
    const h2 = document.createElement('h2');
    h2.textContent = MONTH_NAMES[monthIndex];
    header.appendChild(h2);
    if (isCurrentMonth) {
      const badge = document.createElement('span');
      badge.className = 'month-badge';
      badge.textContent = 'This Month';
      header.appendChild(badge);
    }
    card.appendChild(header);

    const weekdays = document.createElement('div');
    weekdays.className = 'month-weekdays';
    weekdays.setAttribute('aria-hidden', 'true');
    WEEKDAY_LABELS.forEach((label) => {
      const span = document.createElement('span');
      span.textContent = label;
      weekdays.appendChild(span);
    });
    card.appendChild(weekdays);

    const daysWrap = document.createElement('div');
    daysWrap.className = 'month-days';
    const monthEvents = [];

    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    for (let i = 0; i < firstWeekday; i++) {
      const empty = document.createElement('span');
      empty.className = 'cal-day cal-day-empty';
      empty.setAttribute('aria-hidden', 'true');
      daysWrap.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const mmdd = `${pad2(monthIndex + 1)}-${pad2(day)}`;
      const eventText = PLACEHOLDER_EVENTS[mmdd];
      const isToday = isCurrentMonth && day === TODAY.getDate();

      const cell = document.createElement('span');
      cell.className = 'cal-day';

      if (eventText) {
        cell.classList.add('has-event');
        const dot = document.createElement('span');
        dot.className = 'cal-day-dot';
        dot.setAttribute('aria-hidden', 'true');
        cell.append(String(day), dot);
        monthEvents.push({ day, label: `${MONTH_NAMES[monthIndex]} ${day}`, text: eventText });
      } else {
        cell.textContent = String(day);
      }

      if (isToday) cell.classList.add('is-today');
      daysWrap.appendChild(cell);
    }

    card.appendChild(daysWrap);
    card.appendChild(buildMonthAgenda(monthEvents));
    return card;
  }

  function buildMonthAgenda(monthEvents) {
    const wrap = document.createElement('div');
    wrap.className = 'month-agenda';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'month-agenda-eyebrow';
    eyebrow.textContent = "What's on";
    wrap.appendChild(eyebrow);

    if (monthEvents.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'month-agenda-empty-text';
      empty.textContent = 'Nothing on the calendar yet';
      wrap.appendChild(empty);
      return wrap;
    }

    const list = document.createElement('ul');
    list.className = 'month-agenda-list';
    monthEvents.forEach(({ day, label, text }) => {
      const item = document.createElement('li');
      item.className = 'month-agenda-item';
      item.setAttribute('aria-label', `${label}: ${text}`);

      const dayEl = document.createElement('span');
      dayEl.className = 'month-agenda-day';
      dayEl.setAttribute('aria-hidden', 'true');
      dayEl.textContent = String(day);

      const textEl = document.createElement('span');
      textEl.className = 'month-agenda-text';
      textEl.setAttribute('aria-hidden', 'true');
      textEl.textContent = text;

      item.append(dayEl, textEl);
      list.appendChild(item);
    });
    wrap.appendChild(list);
    return wrap;
  }

  function renderCalendar() {
    const grid = document.getElementById('cal-grid');
    const yearLabel = document.getElementById('cal-year-label');
    if (!grid) return;

    if (yearLabel) yearLabel.textContent = `${CALENDAR_YEAR} Calendar`;

    const fragment = document.createDocumentFragment();
    for (let m = 0; m < 12; m++) {
      fragment.appendChild(buildMonthCard(CALENDAR_YEAR, m));
    }
    grid.appendChild(fragment);
  }

  renderCalendar();
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
