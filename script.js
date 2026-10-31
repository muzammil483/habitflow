'use strict';

/* ================= CONFIG ================= */
const KEY = 'habitFlow.v2';
const OLD_KEY = 'habitFlowHabits';
const THEME_KEY = 'habitFlow.theme';
const CATS = { Study: '📚', Health: '🏃', Personal: '👤', Work: '💼', Other: '⭐' };
const CAT_LIST = Object.keys(CATS);
const PRIORITIES = ['High', 'Medium', 'Low'];
const QUOTES = [
  'Small steps every day create big results.',
  'Consistency beats intensity.',
  'Your future is built by what you do today.',
  'Focus on progress, not perfection.',
  'Action creates motivation. Just start.',
  'Never miss twice.',
  'A habit you can finish in two minutes is a habit you will keep.'
];

/* ================= HELPERS ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const shift = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const diffDays = (a, b) => Math.round((fromKey(a) - fromKey(b)) / 864e5);
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

const ICONS = {
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'
};
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
let today = keyOf();
let justDone = null;
var loadFailed = false;
let habits = load();

/* ================= DATA ================= */
function clean(h) {
  if (!h || typeof h !== 'object') return null;
  const name = String(h.name == null ? '' : h.name).trim().slice(0, 60);
  if (!name) return null;
  const hist = Array.isArray(h.history) ? h.history.filter((k) => typeof k === 'string' && KEY_RE.test(k)) : [];
  return {
    id: String(h.id == null ? uid() : h.id),
    name,
    category: CAT_LIST.includes(h.category) ? h.category : 'Other',
    priority: PRIORITIES.includes(h.priority) ? h.priority : 'Medium',
    description: String(h.description == null ? '' : h.description).trim().slice(0, 200),
    createdAt: Number(h.createdAt) || Date.now(),
    history: [...new Set(hist)].sort()
  };
}

function unique(list) {
  const seen = new Set();
  return list.map((h) => {
    if (seen.has(h.id)) h.id = uid();
    seen.add(h.id);
    return h;
  });
}

function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? unique(arr.map(clean).filter(Boolean)) : [];
  } catch (e) {
    loadFailed = true;
    try { localStorage.setItem('habitFlow.corrupt', localStorage.getItem(KEY) || ''); } catch (err) { /* ignore */ }
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(habits));
  } catch (e) {
    toast('Could not save. Browser storage may be full or blocked.', 'error');
  }
}

const find = (id) => habits.find((h) => h.id === id);
const isDone = (h, k) => h.history.includes(k);

/* ================= STATS ================= */
function currentStreak(h) {
  const set = new Set(h.history);
  let d = fromKey(today);
  if (!set.has(keyOf(d))) d = shift(d, -1);
  let n = 0;
  while (set.has(keyOf(d))) { n++; d = shift(d, -1); }
  return n;
}

function bestStreak(h) {
  let best = 0, run = 0, prev = null;
  for (const k of h.history) {
    run = prev && diffDays(k, prev) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = k;
  }
  return best;
}

function rate30(h) {
  const created = keyOf(new Date(h.createdAt));
  const span = Math.max(1, Math.min(30, diffDays(today, created) + 1));
  const count = h.history.filter((k) => { const d = diffDays(today, k); return d >= 0 && d < span; }).length;
  return Math.min(100, Math.round((count / span) * 100));
}

const lastDays = (n) => Array.from({ length: n }, (_, i) => shift(fromKey(today), i - (n - 1)));

/* ================= UI HELPERS ================= */
function toast(msg, type = 'info', action) {
  const box = $('#toasts');
  const el = document.createElement('div');
  const dismiss = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = msg;
  el.appendChild(text);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    b.addEventListener('click', () => { action.fn(); dismiss(); });
    el.appendChild(b);
  }
  box.appendChild(el);
  setTimeout(dismiss, action ? 6000 : 3500);
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  setTimeout(() => root.classList.remove('theme-switching'), 350);
  root.dataset.theme = theme;
  $('#themeIcon').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  $('#themeText').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
}

function toggleMenu(force) {
  const open = typeof force === 'boolean' ? force : !$('#sidebar').classList.contains('open');
  $('#sidebar').classList.toggle('open', open);
  $('#overlay').classList.toggle('show', open);
}

/* ================= CRUD ================= */
const dialog = $('#habitDialog');

function openModal(id) {
  const h = id ? find(id) : null;
  $('#modalTitle').textContent = h ? 'Edit habit' : 'Add habit';
  $('#editHabitId').value = h ? h.id : '';
  $('#habitName').value = h ? h.name : '';
  $('#habitCategory').value = h ? h.category : 'Study';
  $('#habitPriority').value = h ? h.priority : 'Medium';
  $('#habitDescription').value = h ? h.description : '';
  showError('');
  syncSave();
  dialog.showModal();
  $('#habitName').focus();
}

function showError(msg) {
  const el = $('#nameError');
  el.textContent = msg;
  el.hidden = !msg;
}

function saveHabit(e) {
  e.preventDefault();
  const name = $('#habitName').value.trim();
  const editId = $('#editHabitId').value;
  if (!name) return showError('Enter a habit name.');
  if (habits.some((h) => h.id !== editId && h.name.toLowerCase() === name.toLowerCase())) {
    return showError('You already have a habit with this name.');
  }
  const data = {
    name,
    category: $('#habitCategory').value,
    priority: $('#habitPriority').value,
    description: $('#habitDescription').value.trim()
  };
  const h = editId ? find(editId) : null;
  if (h) Object.assign(h, clean({ ...h, ...data }));
  else habits.push(clean({ id: uid(), createdAt: Date.now(), history: [], ...data }));
  save();
  closeDlg(dialog);
  renderAll();
  toast(h ? 'Habit updated' : 'Habit added', 'success');
}

function toggle(id, key = today) {
  if (key > today) return;
  const h = find(id);
  if (!h) return;
  const i = h.history.indexOf(key);
  if (i < 0) { h.history.push(key); h.history.sort(); if (key === today) justDone = id; } else h.history.splice(i, 1);
  save();
  renderAll();
}

function removeHabit(id) {
  const i = habits.findIndex((h) => h.id === id);
  if (i < 0) return;
  const [h] = habits.splice(i, 1);
  save();
  renderAll();
  toast(`Deleted "${h.name}"`, 'info', {
    label: 'Undo',
    fn: () => { habits.splice(Math.min(i, habits.length), 0, h); save(); renderAll(); }
  });
}

/* ================= RENDER ================= */
function renderHeader() {
  const hr = new Date().getHours();
  $('#greeting').textContent = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  $('#todayDate').textContent = fromKey(today).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const dayNo = Math.floor(fromKey(today) / 864e5);
  $('#motivationText').textContent = QUOTES[dayNo % QUOTES.length];
}

function renderHabits() {
  const list = $('#habitList');
  const q = $('#searchInput').value.trim().toLowerCase();
  const cat = $('#categoryFilter').value;
  const status = $('#statusFilter').value;
  const sort = $('#sortFilter').value;

  const items = habits.filter((h) => {
    const done = isDone(h, today);
    return h.name.toLowerCase().includes(q)
      && (cat === 'all' || h.category === cat)
      && (status === 'all' || (status === 'completed' ? done : !done));
  });
  const sorters = {
    newest: (a, b) => b.createdAt - a.createdAt,
    oldest: (a, b) => a.createdAt - b.createdAt,
    name: (a, b) => a.name.localeCompare(b.name),
    streak: (a, b) => bestStreak(b) - bestStreak(a)
  };
  items.sort(sorters[sort] || sorters.newest);

  if (!items.length) {
    const none = habits.length === 0;
    list.innerHTML = `<div class="empty-state"><span aria-hidden="true">🌱</span>
      <h3>${none ? 'No habits yet' : 'No habits match your filters'}</h3>
      <p>${none ? 'Add one small habit and check it off today.' : 'Try a different search or clear the filters.'}</p>
      ${none ? '<button class="primary-btn" type="button" data-action="add">+ Add your first habit</button>' : ''}</div>`;
    return;
  }

  const days = lastDays(7);
  list.innerHTML = items.map((h) => {
    const done = isDone(h, today);
    const week = days.map((d) => {
      const k = keyOf(d);
      const on = isDone(h, k);
      const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      return `<button type="button" class="day ${on ? 'done' : ''} ${k === today ? 'today' : ''}"
        data-action="day" data-id="${esc(h.id)}" data-date="${k}" aria-pressed="${on}" aria-label="${esc(h.name)}, ${label}">
        <span>${d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</span>
        <div class="day-circle">${on ? '✓' : ''}</div></button>`;
    }).join('');
    return `<article class="habit-card ${done ? 'is-done' : ''} ${h.id === justDone ? 'just-done' : ''}">
      <div class="habit-top">
        <div><div class="habit-name">${esc(h.name)}</div>
        <div class="habit-description">${h.description ? esc(h.description) : 'No description.'}</div></div>
        <span class="streak" title="Current streak">🔥 ${currentStreak(h)}</span>
      </div>
      <div class="habit-meta">
        <span class="badge category-badge">${CATS[h.category]} ${esc(h.category)}</span>
        <span class="badge priority-${h.priority.toLowerCase()}">${h.priority} priority</span>
        <span class="badge streak-badge">🏆 Best ${bestStreak(h)}</span>
      </div>
      <div class="week-history">${week}</div>
      <div class="habit-actions">
        <button type="button" class="complete-btn ${done ? 'completed' : ''}" data-action="toggle" data-id="${esc(h.id)}">${done ? '✓ Completed' : 'Mark complete'}</button>
        <button type="button" class="edit-btn" data-action="edit" data-id="${esc(h.id)}" aria-label="Edit ${esc(h.name)}">${icon('edit')}</button>
        <button type="button" class="share-btn" data-action="share" data-id="${esc(h.id)}" aria-label="Share ${esc(h.name)} streak">${icon('share')}</button>
        <button type="button" class="delete-btn" data-action="delete" data-id="${esc(h.id)}" aria-label="Delete ${esc(h.name)}">${icon('trash')}</button>
      </div></article>`;
  }).join('');
  list.removeAttribute('aria-busy');
  justDone = null;
}

function renderDashboard() {
  const total = habits.length;
  const completed = habits.filter((h) => isDone(h, today)).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const best = habits.reduce((m, h) => Math.max(m, bestStreak(h)), 0);
  countTo($('#totalHabits'), total);
  countTo($('#completedToday'), completed);
  countTo($('#pendingToday'), total - completed);
  countTo($('#bestStreak'), best);
  countTo($('#progressText'), pct, '%');
  $('#ringFill').style.strokeDashoffset = 264 * (1 - pct / 100);
  $('#overallProgressBar').style.width = `${pct}%`;
  $('#progressTrack').setAttribute('aria-valuenow', pct);
  $('#progressCompleted').textContent = completed;
  $('#progressTotal').textContent = total;
  $('#progressMessage').textContent =
    !total ? 'Add your first habit to begin.' :
    pct === 0 ? 'Pick one habit and start small.' :
    pct < 50 ? 'Good start. Keep going.' :
    pct < 100 ? 'More than halfway there.' : 'All done today. Great work!';
}

function renderStatistics() {
  const total = habits.length;
  $('#weeklyChart').innerHTML = lastDays(7).map((d) => {
    const k = keyOf(d);
    const n = habits.filter((h) => isDone(h, k)).length;
    const pct = total ? Math.round((n / total) * 100) : 0;
    return `<div class="chart-col ${k === today ? 'is-today' : ''}">
      <span class="chart-value">${n}</span>
      <div class="bar-track"><div class="chart-bar" style="height:${pct}%"></div></div>
      <span class="chart-label">${d.toLocaleDateString('en-US', { weekday: 'short' })}</span></div>`;
  }).join('');

  const top = habits.map((h) => ({ h, r: rate30(h) })).sort((a, b) => b.r - a.r).slice(0, 5);
  $('#performanceList').innerHTML = top.length
    ? top.map(({ h, r }) => `<div class="perf-item">
        <div class="perf-row"><strong>${esc(h.name)}</strong><span>${r}%</span></div>
        <div class="perf-track"><div class="perf-fill" style="width:${r}%"></div></div>
        <small class="muted-note">${esc(h.category)} · 🔥 ${currentStreak(h)} day streak</small></div>`).join('')
    : '<p class="muted-note">Add a habit to see your stats.</p>';

  const start = shift(fromKey(today), -83);
  let cells = '<div class="heat-cell blank"></div>'.repeat(start.getDay());
  for (let i = 0; i < 84; i++) {
    const k = keyOf(shift(start, i));
    const n = habits.filter((h) => isDone(h, k)).length;
    const lvl = !n ? 0 : Math.min(4, Math.max(1, Math.ceil((n / total) * 4)));
    cells += `<div class="heat-cell" data-l="${lvl}" title="${k}: ${n} done"></div>`;
  }
  $('#heatmap').innerHTML = cells;
}

function renderAll() {
  renderHabits();
  renderDashboard();
  renderStatistics();
}

/* ================= DATA TOOLS ================= */
function exportData() {
  const blob = new Blob([JSON.stringify(habits, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `habitflow_backup_${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('bad format');
      const list = unique(data.map(clean).filter(Boolean));
      if (!list.length) return toast('No valid habits found in this file.', 'error');
      if (!confirm(`Import ${list.length} habits? This replaces your current ${habits.length} habits.`)) return;
      habits = list;
      save();
      renderAll();
      toast(`Imported ${list.length} habits`, 'success');
    } catch (err) {
      toast('This file is not a valid HabitFlow backup.', 'error');
    }
  };
  reader.onerror = () => toast('Could not read the file.', 'error');
  reader.readAsText(file);
  e.target.value = '';
}

function clearAll() {
  if (!habits.length) return toast('There is nothing to delete.');
  if (!confirm('Delete ALL habits and history? This cannot be undone. Export a backup first if unsure.')) return;
  habits = [];
  save();
  renderAll();
  toast('All habits deleted', 'info');
}

/* ================= EVENTS ================= */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id, date } = el.dataset;
  const actions = {
    add: () => openModal(),
    edit: () => openModal(id),
    close: () => closeDlg(dialog),
    toggle: () => toggle(id),
    day: () => toggle(id, date),
    delete: () => removeHabit(id),
    theme: () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'),
    menu: () => toggleMenu(),
    export: exportData,
    clear: clearAll,
    share: () => openShare(id),
    'close-share': () => closeDlg(shareDialog),
    'share-wa': () => shareWhatsApp(),
    'share-ig': () => shareInstagram(),
    'share-copy': () => shareCopy(),
    'share-native': () => shareNative(),
    reminder: toggleReminder
  };
  if (actions[action]) actions[action]();
});

dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDlg(dialog); });
$('#habitForm').addEventListener('submit', saveHabit);
$('#habitName').addEventListener('input', () => { showError(''); syncSave(); });
$('#importFile').addEventListener('change', importData);
['searchInput', 'categoryFilter', 'statusFilter', 'sortFilter'].forEach((id) => {
  $('#' + id).addEventListener(id === 'searchInput' ? 'input' : 'change', renderHabits);
});

/* Sidebar: close on link click, highlight the section in view */
document.querySelectorAll('.nav-link').forEach((a) => a.addEventListener('click', () => toggleMenu(false)));
const links = [...document.querySelectorAll('.nav-link')];
const observer = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.dataset.nav === en.target.id));
  });
}, { rootMargin: '-35% 0px -60% 0px' });
document.querySelectorAll('.page-section').forEach((s) => observer.observe(s));

/* Refresh when the date changes (midnight or tab left open) */
function tick() {
  const k = keyOf();
  if (k !== today) { today = k; renderHeader(); renderAll(); }
}
setInterval(tick, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

/* ================= INIT ================= */
applyTheme(document.documentElement.dataset.theme || 'light');
renderHeader();
save();
renderAll();

/* ================= SHARE STREAK ================= */
const shareDialog = $('#shareDialog');
let shareId = null;
shareDialog.addEventListener('click', (e) => { if (e.target === shareDialog) closeDlg(shareDialog); });

function shareText(h) {
  const link = location.protocol.indexOf('http') === 0 ? new URL('index.html', location.href).href : '';
  return `🔥 ${currentStreak(h)}-day streak on "${h.name}" with HabitFlow! Can you beat it?${link ? ' ' + link : ''}`;
}

function openShare(id) {
  const h = find(id);
  if (!h) return;
  shareId = id;
  $('#sharePreview').textContent = shareText(h);
  shareDialog.showModal();
}

function shareWhatsApp() {
  const h = find(shareId);
  if (h) window.open('https://wa.me/?text=' + encodeURIComponent(shareText(h)), '_blank', 'noopener');
}

function shareCopy() {
  const h = find(shareId);
  if (!h) return;
  const done = () => toast('Copied. Paste it anywhere.', 'success');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(shareText(h)).then(done, () => toast('Could not copy. Select the text and copy it.', 'error'));
  else toast('Copy is not supported here. Select the text and copy it.', 'error');
}

function shareNative() {
  const h = find(shareId);
  if (!h) return;
  if (!navigator.share) return toast('Your browser has no share menu. Use WhatsApp or Copy.', 'error');
  navigator.share({ text: shareText(h) }).catch(() => {});
}

async function streakImage(h) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1920;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1920);
  g.addColorStop(0, '#0e1b17'); g.addColorStop(1, '#0b7f5e');
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
  const f = '"Plus Jakarta Sans", system-ui, sans-serif';
  x.textAlign = 'center'; x.fillStyle = '#fff';
  x.font = `200px ${f}`; x.fillText('🔥', 540, 720);
  x.font = `800 380px ${f}`; x.fillText(String(currentStreak(h)), 540, 1080);
  x.font = `700 76px ${f}`; x.fillText(currentStreak(h) === 1 ? 'day streak' : 'day streak', 540, 1190);
  x.font = `600 62px ${f}`; x.fillStyle = '#bfe9db';
  x.fillText(h.name.length > 28 ? h.name.slice(0, 27) + '…' : h.name, 540, 1330);
  x.font = `700 48px ${f}`; x.fillStyle = '#fff';
  x.fillText('Tracked with HabitFlow', 540, 1740);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

async function shareInstagram() {
  const h = find(shareId);
  if (!h) return;
  const blob = await streakImage(h);
  if (!blob) return toast('Could not create the image.', 'error');
  const file = new File([blob], `streak-${currentStreak(h)}-days.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: shareText(h) }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Picture saved. Open Instagram and add it to your Story.', 'success');
}

/* ================= DAILY REMINDER ================= */
const REM_KEY = 'habitFlow.reminder';
let reminder = (() => {
  try { return Object.assign({ on: false, time: '20:00' }, JSON.parse(localStorage.getItem(REM_KEY))); }
  catch (e) { return { on: false, time: '20:00' }; }
})();
let lastReminded = '';

function persistReminder() { try { localStorage.setItem(REM_KEY, JSON.stringify(reminder)); } catch (e) { /* ignore */ } }

function renderReminder() {
  $('#reminderTime').value = reminder.time;
  $('#reminderBtn').textContent = reminder.on ? 'Turn off' : 'Turn on';
  $('#reminderStatus').textContent = reminder.on ? `On, every day at ${reminder.time}` : 'Off';
}

async function toggleReminder() {
  if (!('Notification' in window)) return toast('This browser does not support notifications.', 'error');
  if (!reminder.on) {
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (p !== 'granted') return toast('Notifications are blocked. Allow them in your browser settings.', 'error');
    reminder.time = $('#reminderTime').value || '20:00';
    reminder.on = true;
  } else {
    reminder.on = false;
  }
  persistReminder();
  renderReminder();
}

function checkReminder() {
  if (!reminder.on || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const stamp = keyOf(now) + hm;
  if (hm !== reminder.time || lastReminded === stamp) return;
  const left = habits.filter((h) => !isDone(h, keyOf(now))).length;
  if (!left) return;
  lastReminded = stamp;
  const body = `${left} habit${left > 1 ? 's' : ''} left today. Keep your streak alive!`;
  const plain = () => { try { new Notification('HabitFlow', { body }); } catch (e) { /* ignore */ } };
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
    navigator.serviceWorker.getRegistration().then((r) => (r ? r.showNotification('HabitFlow', { body, icon: 'icon.svg' }) : plain())).catch(plain);
  } else plain();
}

$('#reminderTime').addEventListener('change', () => {
  reminder.time = $('#reminderTime').value || '20:00';
  persistReminder();
  renderReminder();
});
renderReminder();
setInterval(checkReminder, 20000);

/* ================= INSTALLABLE APP (PWA) ================= */
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ================= POLISH: motion, dialogs, shortcuts ================= */
function reduceMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

function countTo(el, val, suffix = '') {
  const from = Number(el._v == null ? 0 : el._v);
  el._v = val;
  if (from === val || reduceMotion()) { el.textContent = val + suffix; return; }
  const t0 = performance.now();
  (function step(t) {
    const p = Math.min(1, (t - t0) / 600);
    el.textContent = Math.round(from + (val - from) * (1 - Math.pow(1 - p, 3))) + suffix;
    if (p < 1 && el._v === val) requestAnimationFrame(step);
  })(t0);
}

function closeDlg(d) {
  if (!d.open) return;
  if (reduceMotion()) { d.close(); return; }
  d.classList.add('closing');
  setTimeout(() => { d.classList.remove('closing'); d.close(); }, 180);
}

function syncSave() {
  $('#habitForm button[type="submit"]').disabled = !$('#habitName').value.trim();
}

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest && e.target.closest('input,textarea,select')) return;
  if (document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase();
  if (k === 'n') { e.preventDefault(); openModal(); }
  else if (k === '/') { e.preventDefault(); $('#habits').scrollIntoView(); $('#searchInput').focus(); }
  else if (k === 't') applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

if (loadFailed) toast('Your saved data could not be read. A copy was kept aside so nothing is lost.', 'error');