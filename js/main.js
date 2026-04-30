'use strict';

/* ═══════════════════════════════════════════════════════════
   CN Project 2 — main.js
   Security features:
     • XSS input sanitization
     • Honeypot bot detection
     • Client-side rate limiting
     • Input validation
   Performance features:
     • Lazy image loading (IntersectionObserver)
     • Scroll-triggered reveal animations
   UX:
     • Sticky nav scroll effect
     • Mobile menu toggle
═══════════════════════════════════════════════════════════ */

/* ── 1. XSS Sanitizer ─────────────────────────────────────
   Escapes all HTML-special characters so user input can
   never be interpreted as markup or script.               */
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/* ── 2. Input validators ──────────────────────────────────  */
const validators = {
  name:    v => v.trim().length >= 2  && v.trim().length <= 100,
  email:   v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) && v.length <= 254,
  message: v => v.trim().length >= 10 && v.trim().length <= 2000,
};
const errorMsgs = {
  name:    'Name must be 2–100 characters.',
  email:   'Please enter a valid email address.',
  message: 'Message must be 10–2000 characters.',
};

function showError(id, msg) {
  const errEl  = document.getElementById(id + '-error');
  const inputEl = document.getElementById(id);
  if (errEl)  errEl.textContent = msg;
  if (inputEl) inputEl.classList.toggle('invalid', !!msg);
}

/* ── 3. Contact form ──────────────────────────────────────  */
const form      = document.getElementById('contact-form');
const statusDiv = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

// Rate limit: one submission per 10 seconds
let lastSubmit = 0;
const COOLDOWN = 10_000;

if (form) {
  // Live validation on blur
  ['name', 'email', 'message'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => {
      showError(id, validators[id](el.value) ? '' : errorMsgs[id]);
    });
    el.addEventListener('input', () => {
      if (el.classList.contains('invalid')) {
        showError(id, validators[id](el.value) ? '' : errorMsgs[id]);
      }
    });
  });

  // Character counter for textarea
  const msgEl      = document.getElementById('message');
  const charCount  = document.getElementById('char-count');
  if (msgEl && charCount) {
    msgEl.addEventListener('input', () => {
      charCount.textContent = `${msgEl.value.length} / 2000`;
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();

    // ── Honeypot check ────────────────────────────────────
    // Real users never see or fill the #website field.
    // If it's filled → bot → silently reject.
    const honeypot = document.getElementById('website');
    if (honeypot && honeypot.value.trim() !== '') {
      // Fake success to confuse bots
      showStatus('success', '✓ Message sent! Thanks for reaching out.');
      form.reset();
      return;
    }

    // ── Client-side rate limit ────────────────────────────
    const now = Date.now();
    if (now - lastSubmit < COOLDOWN) {
      showStatus('error', '⚠ Please wait a moment before sending again.');
      return;
    }

    // ── Validate all fields ───────────────────────────────
    let valid = true;
    ['name', 'email', 'message'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!validators[id](el.value)) {
        showError(id, errorMsgs[id]);
        valid = false;
      }
    });
    if (!valid) return;

    // ── Sanitize before any use ───────────────────────────
    const cleanName    = sanitize(document.getElementById('name').value.trim());
    const cleanEmail   = sanitize(document.getElementById('email').value.trim());
    const cleanMessage = sanitize(document.getElementById('message').value.trim());

    // ── Simulate submission (static site) ─────────────────
    // In a real backend, you'd POST to /api/contact here.
    setLoading(true);
    setTimeout(() => {
      lastSubmit = Date.now();
      console.log('Sanitized form data:', { name: cleanName, email: cleanEmail, message: cleanMessage });
      showStatus('success', '✓ Message received! (Demo mode — no backend on static site.)');
      form.reset();
      if (charCount) charCount.textContent = '0 / 2000';
      setLoading(false);
    }, 800);
  });
}

function showStatus(type, msg) {
  if (!statusDiv) return;
  statusDiv.textContent = msg;
  statusDiv.className   = 'form-status ' + type;
  statusDiv.hidden      = false;
  statusDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setLoading(on) {
  if (!submitBtn) return;
  submitBtn.disabled = on;
  const t = submitBtn.querySelector('.btn-text');
  const l = submitBtn.querySelector('.btn-loading');
  if (t) t.hidden = on;
  if (l) l.hidden = !on;
}

/* ── 4. Scroll-reveal animations ─────────────────────────  */
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 60);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  revealEls.forEach(el => revealObserver.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('visible'));
}

/* ── 5. Lazy image loading ─────────────────────────────────
   Use <img data-src="..." alt="..."> in HTML.
   Images load only when they enter the viewport.          */
const lazyImages = document.querySelectorAll('img[data-src]');
if (lazyImages.length) {
  if ('IntersectionObserver' in window) {
    const imgObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imgObserver.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    lazyImages.forEach(img => imgObserver.observe(img));
  } else {
    // Fallback: load all immediately
    lazyImages.forEach(img => { img.src = img.dataset.src; });
  }
}

/* ── 6. Mobile nav toggle ─────────────────────────────────  */
const menuToggle = document.getElementById('menu-toggle');
const nav        = document.querySelector('.nav');
if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  // Close on outside click
  document.addEventListener('click', e => {
    if (!menuToggle.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}
