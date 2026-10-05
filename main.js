// Fit the hero name to the box CSS gives .hero__name:
// font size fills the width, then a vertical stretch fills the height.

const MAX_STRETCH = 1.6;

const name = document.querySelector('.hero__name');
const nameText = name.querySelector('.hero__name-text');

function fitName() {
  const box = name.getBoundingClientRect();
  const fontSize = parseFloat(getComputedStyle(nameText).fontSize);

  // Measure the rendered text. Its width isn't affected by the vertical stretch,
  // and offsetHeight ignores transforms; CSS trims the box to the capitals.
  const textWidth = nameText.getBoundingClientRect().width;
  const capHeight = nameText.offsetHeight;

  const size = (fontSize * box.width) / textWidth;
  const k = size / fontSize;
  const stretch = Math.min(Math.max(box.height / (capHeight * k), 1), MAX_STRETCH);

  // Only a font-size change resizes the text (and re-triggers the observer below),
  // so skip tiny ones to avoid looping on rounding. The stretch is just a transform.
  if (Math.abs(size - fontSize) >= 0.1) {
    name.style.setProperty('--name-size', `${size}px`);
  }
  name.style.setProperty('--name-stretch', stretch.toFixed(3));
}

let fitFrame = 0;
function scheduleFit() {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(fitName);
}

// Refit when the box resizes, and when the text's own size changes
// (e.g. the web font finishing loading). Also runs once on start.
const nameObserver = new ResizeObserver(scheduleFit);
nameObserver.observe(name);
nameObserver.observe(nameText);


// Hero photo rises as you scroll, until the quote's centre reaches the middle
// of the screen, then stays put.

const PHOTO_RISE = 0.3;   // how far it rises, as a fraction of the photo's height

const photo = document.querySelector('.hero__photo');
const quote = document.querySelector('.hero__quote');
let riseEnd = 1;          // scroll position where the rise finishes
let riseDistance = 0;

// Position on the page, ignoring transforms (the quote animates in on load).
function pageTop(el) {
  let top = 0;
  for (; el; el = el.offsetParent) top += el.offsetTop;
  return top;
}

function measureRise() {
  riseEnd = Math.max(1, pageTop(quote) + quote.offsetHeight / 2 - innerHeight / 2);
  riseDistance = photo.offsetHeight * PHOTO_RISE;
  updateRise();
}

function updateRise() {
  const progress = Math.min(scrollY / riseEnd, 1);
  photo.style.setProperty('--photo-rise', `${(-progress * riseDistance).toFixed(1)}px`);
}

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let riseFrame = 0;
  addEventListener('scroll', () => {
    cancelAnimationFrame(riseFrame);
    riseFrame = requestAnimationFrame(updateRise);
  }, { passive: true });

  // Re-measure when the layout or the screen size changes (e.g. fonts loading).
  addEventListener('resize', measureRise);
  new ResizeObserver(measureRise).observe(document.body);
}


// What I do: hovering, focusing or tapping a service fades its description in
// on the right. Leaving the section with the mouse brings the intro back.

const services = document.querySelector('.services');
const serviceItems = services.querySelectorAll('.services__item');
const servicePanels = services.querySelectorAll('.services__panel');

function showService(panelId) {
  servicePanels.forEach((panel) => panel.classList.toggle('is-active', panel.id === panelId));
  serviceItems.forEach((item) => {
    item.classList.toggle('is-active', item.getAttribute('aria-describedby') === panelId);
  });
}

serviceItems.forEach((item) => {
  const show = () => showService(item.getAttribute('aria-describedby'));
  item.addEventListener('pointerenter', show);
  item.addEventListener('focus', show);
  item.addEventListener('click', show);
});

services.addEventListener('pointerleave', (event) => {
  if (event.pointerType === 'mouse') showService('service-intro');
});


// Mobile menu: the hamburger drops the pink bands down from the top.

const menuToggle = document.querySelector('.site-nav__toggle');
const menu = document.getElementById('menu');

function setMenu(open) {
  menu.classList.toggle('is-open', open);
  menu.inert = !open;
  document.documentElement.classList.toggle('is-menu-open', open);
  menuToggle.setAttribute('aria-expanded', open);
}

menuToggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));

// Close after picking a link, on Escape, or if the screen widens past phone size.
menu.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.classList.contains('is-open')) {
    setMenu(false);
    menuToggle.focus();
  }
});

matchMedia('(min-width: 701px)').addEventListener('change', (event) => {
  if (event.matches) setMenu(false);
});


// Contact form: checks the fields, filters out spam and sends the enquiry.
// These browser-side checks stop honest mistakes and simple bots; whatever
// receives the form must check again, because anyone can bypass a browser.

const contactForm = document.getElementById('contact-form');
const contactFields = contactForm.elements;
const contactStatus = contactForm.querySelector('.contact__status');
const contactSubmit = contactForm.querySelector('.contact__submit');
const messageCount = document.getElementById('contact-message-count');

const MIN_FILL_MS = 3000;          // people take longer than this to fill the form in
const COOLDOWN_MS = 60 * 1000;     // one enquiry a minute from the same browser
const SEND_TIMEOUT_MS = 15000;
const COOLDOWN_KEY = 'contact-last-sent';
const formShownAt = Date.now();

// Invisible control characters (other than line breaks) have no place here.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (value) => value.replace(CONTROL_CHARS, '').trim();

const checks = {
  name: (value) => (value.length >= 2 ? '' : 'Please enter your name.'),
  email: (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? '' : 'Please enter a valid email address.'),
  message: (value) => (value.length >= 10 ? '' : 'Please write a message of at least 10 characters.'),
};

// Messages are only ever set with textContent, never as HTML.
function showError(field, message) {
  document.getElementById(`${field.id}-error`).textContent = message;
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function updateCount() {
  const message = contactFields['message'];
  messageCount.textContent = `${message.value.length} / ${message.maxLength}`;
}

function lastSentAt() {
  try { return Number(localStorage.getItem(COOLDOWN_KEY)) || 0; } catch { return 0; }
}

function rememberSent() {
  try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch { /* private mode */ }
}

async function sendToService(endpoint, data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
      credentials: 'omit',   // never send cookies along with the enquiry
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Form service replied ${response.status}`);
  } finally {
    clearTimeout(timer);
  }
}

// No form service yet: hand the message to the visitor's email app instead.
function openEmailApp(to, data) {
  const subject = `${data.enquiry} enquiry from ${data.name}`;
  const body = `${data.message}\n\n${data.name}\n${data.email}`;
  location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function resetForm() {
  contactForm.reset();
  updateCount();
}

contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  contactStatus.textContent = '';

  const data = {
    name: clean(contactFields['name'].value),
    email: clean(contactFields['email'].value),
    enquiry: contactFields['enquiry'].value,
    message: clean(contactFields['message'].value),
  };

  // Likely a bot (trap field filled in, or submitted instantly): look like it
  // worked, but send nothing.
  if (contactFields['website'].value || Date.now() - formShownAt < MIN_FILL_MS) {
    resetForm();
    contactStatus.textContent = 'Thanks! Your message has been sent.';
    return;
  }

  let firstInvalid = null;
  for (const [name, check] of Object.entries(checks)) {
    const problem = check(data[name]);
    showError(contactFields[name], problem);
    if (problem && !firstInvalid) firstInvalid = contactFields[name];
  }
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  if (Date.now() - lastSentAt() < COOLDOWN_MS) {
    contactStatus.textContent = 'Thanks, your last message is on its way. Please wait a minute before sending another.';
    return;
  }

  // Only accept one of the listed enquiry types.
  const options = [...contactFields['enquiry'].options].map((option) => option.value);
  if (!options.includes(data.enquiry)) data.enquiry = 'Something else';

  const endpoint = contactForm.dataset.endpoint;
  contactSubmit.disabled = true;
  contactStatus.textContent = 'Sending…';
  try {
    if (endpoint.startsWith('https://')) {
      await sendToService(endpoint, data);
      contactStatus.textContent = 'Thanks! Your message has been sent. Chanelle will be in touch soon.';
    } else {
      openEmailApp(contactForm.dataset.email, data);
      contactStatus.textContent = 'Your email app should now open with your message ready to send.';
    }
    rememberSent();
    resetForm();
  } catch {
    contactStatus.textContent = `Sorry, something went wrong. Please try again, or email ${contactForm.dataset.email}.`;
  } finally {
    contactSubmit.disabled = false;
  }
});

// Live character count, and clear a field's error as soon as it's fixed.
contactForm.addEventListener('input', (event) => {
  const field = event.target;
  if (field.name === 'message') updateCount();
  if (checks[field.name] && field.getAttribute('aria-invalid') === 'true') {
    showError(field, checks[field.name](clean(field.value)));
  }
});

// "Book a consultation call" buttons pick that enquiry type on the way down.
document.querySelectorAll('a[data-enquiry]').forEach((link) => {
  link.addEventListener('click', () => {
    contactFields['enquiry'].value = link.dataset.enquiry;
    contactFields['enquiry'].dispatchEvent(new Event('change'));
  });
});


// Custom dropdown: replaces the browser's own <select> list (which can't be
// styled in most browsers or on phones) with one that matches the site. It
// follows the ARIA "select-only combobox" pattern, so it works by keyboard and
// with screen readers, and keeps the real <select> (now hidden) in sync, so
// the form reads its value exactly as before.

function enhanceSelect(select) {
  const label = document.querySelector(`label[for="${select.id}"]`);
  const options = [...select.options];
  label.id ||= `${select.id}-label`;

  const wrapper = document.createElement('div');
  wrapper.className = 'select';

  // A focusable element with role="combobox" rather than a <button>: Safari
  // leaves buttons out of the Tab order by default, but not this.
  const button = document.createElement('div');
  button.tabIndex = 0;
  button.id = `${select.id}-button`;
  button.className = 'select__button';
  button.setAttribute('role', 'combobox');
  button.setAttribute('aria-labelledby', label.id);
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', `${select.id}-list`);

  const list = document.createElement('ul');
  list.id = `${select.id}-list`;
  list.className = 'select__list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-labelledby', label.id);
  list.hidden = true;

  const items = options.map((option, i) => {
    const item = document.createElement('li');
    item.id = `${select.id}-option-${i}`;
    item.className = 'select__option';
    item.setAttribute('role', 'option');
    item.textContent = option.textContent;
    list.append(item);
    return item;
  });

  let active = 0;
  const isOpen = () => !list.hidden;

  // Show the <select>'s current choice on the button and in the list.
  function sync() {
    button.textContent = options[select.selectedIndex].textContent;
    items.forEach((item, i) => item.setAttribute('aria-selected', String(i === select.selectedIndex)));
  }

  function setActive(index) {
    active = Math.max(0, Math.min(index, items.length - 1));
    items.forEach((item, i) => item.classList.toggle('is-active', i === active));
    button.setAttribute('aria-activedescendant', items[active].id);
  }

  function open() {
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    setActive(select.selectedIndex);
  }

  function close() {
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.removeAttribute('aria-activedescendant');
  }

  function choose(index) {
    if (select.selectedIndex !== index) {
      select.selectedIndex = index;
      select.dispatchEvent(new Event('change'));
    }
    close();
  }

  // Jump to the next option starting with a typed letter.
  function typeAhead(key) {
    const letter = key.toLowerCase();
    for (let step = 1; step <= items.length; step++) {
      const i = (active + step) % items.length;
      if (items[i].textContent.toLowerCase().startsWith(letter)) return setActive(i);
    }
  }

  button.addEventListener('click', () => (isOpen() ? close() : open()));

  button.addEventListener('keydown', (event) => {
    const { key } = event;
    if (!isOpen()) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        event.preventDefault();
        open();
      } else if (key.length === 1 && key !== ' ') {
        open();
        typeAhead(key);
      }
      return;
    }
    if (key === 'ArrowDown') { event.preventDefault(); setActive(active + 1); }
    else if (key === 'ArrowUp') { event.preventDefault(); setActive(active - 1); }
    else if (key === 'Home') { event.preventDefault(); setActive(0); }
    else if (key === 'End') { event.preventDefault(); setActive(items.length - 1); }
    else if (key === 'Enter' || key === ' ') { event.preventDefault(); choose(active); }
    else if (key === 'Escape') { event.preventDefault(); close(); }
    else if (key === 'Tab') { choose(active); }
    else if (key.length === 1) { typeAhead(key); }
  });

  items.forEach((item, i) => {
    item.addEventListener('pointerenter', () => setActive(i));
    item.addEventListener('click', () => {
      choose(i);
      button.focus();
    });
  });

  // Keep focus on the button while picking with the mouse; close when
  // focus or a tap goes anywhere else.
  list.addEventListener('mousedown', (event) => event.preventDefault());
  wrapper.addEventListener('focusout', (event) => {
    if (!wrapper.contains(event.relatedTarget)) close();
  });
  document.addEventListener('pointerdown', (event) => {
    if (isOpen() && !wrapper.contains(event.target)) close();
  });

  select.addEventListener('change', sync);
  select.form.addEventListener('reset', () => setTimeout(sync));

  // The label now names the dropdown; clicking it focuses it, as for a field.
  label.htmlFor = '';
  label.addEventListener('click', () => button.focus());
  wrapper.append(button, list);
  select.after(wrapper);
  select.hidden = true;   // still part of the form, just not shown
  sync();
}

enhanceSelect(contactFields['enquiry']);


// She's Social heart: anyone can send one heart (once per browser) and
// everyone sees the shared total. The total is kept by a counter service at
// the addresses in the HTML (data-get / data-hit), not by the website host.

const heart = document.querySelector('.heart');
const heartButton = heart.querySelector('.heart__button');
const heartNumber = heart.querySelector('.heart__number');
const HEARTED_KEY = 'shes-social-hearted';

function hasHearted() {
  try { return localStorage.getItem(HEARTED_KEY) === '1'; } catch { return false; }
}

function rememberHeart() {
  try { localStorage.setItem(HEARTED_KEY, '1'); } catch { /* private mode */ }
}

function showHearts(value) {
  heartNumber.textContent = value.toLocaleString('en-AU');
}

async function fetchHearts(url) {
  const response = await fetch(url, { credentials: 'omit' });
  if (response.status === 404) return 0;   // nobody has sent a heart yet
  if (!response.ok) throw new Error(`Counter replied ${response.status}`);
  const value = Number((await response.json()).value);
  if (!Number.isInteger(value) || value < 0) throw new Error('Unexpected count');
  return value;
}

heartButton.setAttribute('aria-pressed', String(hasHearted()));
fetchHearts(heart.dataset.get).then(showHearts).catch(() => { /* keep the dash */ });

heartButton.addEventListener('click', async () => {
  // Replay the pop on every tap.
  heartButton.classList.remove('is-popping');
  void heartButton.offsetWidth;
  heartButton.classList.add('is-popping');

  if (hasHearted()) return;   // one heart per visitor
  rememberHeart();
  heartButton.setAttribute('aria-pressed', 'true');

  // Show it straight away, then settle on the counter's real total.
  const shown = Number(heartNumber.textContent.replace(/\D/g, '')) || 0;
  showHearts(shown + 1);
  try {
    showHearts(await fetchHearts(heart.dataset.hit));
  } catch { /* keep the number already shown */ }
});
