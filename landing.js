'use strict';
const CONTACT_EMAIL = 'muzammilpakistanim@gmail.com'; // change this to your real email

const nav = document.getElementById('siteNav');
document.getElementById('menuToggle').addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  document.getElementById('menuToggle').setAttribute('aria-expanded', open);
});
nav.addEventListener('click', (e) => { if (e.target.tagName === 'A') nav.classList.remove('open'); });
document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('contactForm');
const note = document.getElementById('formNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();
  if (!name || !message || !/^\S+@\S+\.\S+$/.test(email)) {
    note.textContent = 'Please enter your name, a valid email and a message.';
    note.className = 'form-note bad';
    return;
  }
  const subject = encodeURIComponent(`HabitFlow message from ${name}`);
  const body = encodeURIComponent(`${message}\n\nFrom: ${name} <${email}>`);
  note.textContent = 'Opening your email app. Press send there to finish.';
  note.className = 'form-note good';
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
});

/* Scroll reveal + active nav link */
document.documentElement.classList.add('js');
const revealEls = document.querySelectorAll('.feature,.steps li,.values li,.faq details,.about-grid>div,.contact-grid>*,.cta .wrap');
revealEls.forEach((el, i) => { el.classList.add('reveal'); el.style.transitionDelay = (i % 3) * 80 + 'ms'; });
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((list) => list.forEach((x) => {
    if (x.isIntersecting) {
      x.target.classList.add('in');
      setTimeout(() => { x.target.style.transitionDelay = ''; }, 900);
      io.unobserve(x.target);
    }
  }), { threshold: 0.12 });
  revealEls.forEach((el) => io.observe(el));
  const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
  const so = new IntersectionObserver((list) => list.forEach((x) => {
    if (x.isIntersecting) navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + x.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['features', 'how', 'about', 'faq', 'contact'].forEach((id) => { const sec = document.getElementById(id); if (sec) so.observe(sec); });
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}