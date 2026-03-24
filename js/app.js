// ── Emoji Pool ──
const EMOJIS = [
  '🎸','🚀','🌮','🐶','🎯','🍕','⚡','🦄','🎨','🌈',
  '🍩','🐱','🏄','🎪','🦋','🍦','🔥','🐸','🎵','🌻',
  '🦊','🎲','🍉','🐙','✨','🎭','🍔','🐝','🌊','🎈',
  '🦜','🍿','🐳','🎻','🌺','🦁','🍣','🎤','🐼','🌟',
  '🦩','🍪','🐬','🎹','🌴','🦑','🍭','🎬','🐧','💎'
];

function pickRandomEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

// ── Schedule Constants ──
const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const DAY_LABELS = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miercoles', jueves: 'Jueves', viernes: 'Viernes' };
const DAY_SHORT = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mie', jueves: 'Jue', viernes: 'Vie' };
const DAY_COLORS = { lunes: '#f5c518', martes: '#4ecdc4', miercoles: '#45b7d1', jueves: '#a78bfa', viernes: '#e94560' };
const DEFAULT_PERIODS = 7;

// ── State ──
const DEFAULT_META = 10;
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem('premio-state');
    if (raw) {
      const s = JSON.parse(raw);
      if (!s.schedule) s.schedule = {};
      if (!s.schedule.periods) s.schedule.periods = DEFAULT_PERIODS;
      DAYS.forEach((d) => {
        if (!s.schedule[d]) s.schedule[d] = [];
        // Ensure array length matches periods
        while (s.schedule[d].length < s.schedule.periods) s.schedule[d].push('');
      });
      return s;
    }
  } catch {}
  const schedule = { periods: DEFAULT_PERIODS };
  DAYS.forEach((d) => { schedule[d] = Array(DEFAULT_PERIODS).fill(''); });
  return { meta: DEFAULT_META, items: [], history: [], schedule };
}

function save() {
  localStorage.setItem('premio-state', JSON.stringify(state));
}

// ── DOM refs ──
const $grid = document.getElementById('checklist-grid');
const $progressText = document.getElementById('progress-text');
const $progressFill = document.getElementById('progress-fill');
const $historyList = document.getElementById('history-list');
const $metaValue = document.getElementById('meta-value');
const $bgPattern = document.getElementById('bg-pattern');
const $scheduleWrap = document.getElementById('schedule-wrap');
const $scheduleEditor = document.getElementById('schedule-editor');
const $subjectModal = document.getElementById('subject-modal');
const $subjectInput = document.getElementById('subject-input');
const $subjectModalDay = document.getElementById('subject-modal-day');
const $titleLine1 = document.getElementById('title-line1');
const $sectionTabs = document.querySelectorAll('.section-tab');
const $sections = document.querySelectorAll('.section');
let editingDay = null;

// Modals
const $noteModal = document.getElementById('note-modal');
const $noteInput = document.getElementById('note-input');
const $prizeModal = document.getElementById('prize-modal');
const $prizeInput = document.getElementById('prize-input');
const $confetti = document.getElementById('confetti');

let pendingIndex = null;

// ── Init ──
function init() {
  ensureItems();
  renderBgPattern();
  renderChecklist();
  renderProgress();
  renderHistory();
  renderMeta();
  renderSchedule();
  renderScheduleEditor();
}

function renderBgPattern() {
  const emoji = state.roundEmoji || '⭐';
  // Fill enough emojis to cover the oversized rotated area
  const count = 600;
  $bgPattern.textContent = (emoji + ' ').repeat(count);
}

function ensureItems() {
  // Assign one emoji for the whole round
  if (!state.roundEmoji) {
    state.roundEmoji = pickRandomEmoji();
  }
  while (state.items.length < state.meta) {
    state.items.push({ done: false, note: '' });
  }
  // If meta decreased, trim unchecked items from the end
  if (state.items.length > state.meta) {
    state.items = state.items.slice(0, state.meta);
  }
  save();
}

// ── Checklist ──
function renderChecklist() {
  $grid.innerHTML = '';
  const emoji = state.roundEmoji || '⭐';
  state.items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = `check-item${item.done ? ' done' : ''}`;
    const labelText = item.note || (item.done ? 'Hecho' : '...');
    const dateText = item.done && item.date ? formatShortDate(item.date) : '';
    el.innerHTML = `
      <div class="check-circle"><span class="emoji">${emoji}</span></div>
      <div class="check-label">${labelText}</div>
      ${dateText ? `<div class="check-date">${dateText}</div>` : ''}
    `;
    el.addEventListener('click', () => onItemClick(i));
    $grid.appendChild(el);
  });
}

function renderProgress() {
  const done = state.items.filter((it) => it.done).length;
  $progressText.innerHTML = `<span>${done}</span> de <span>${state.meta}</span> completadas`;
  $progressFill.style.width = `${(done / state.meta) * 100}%`;
}

function onItemClick(index) {
  const item = state.items[index];
  if (item.done) {
    // Toggle off
    item.done = false;
    item.note = '';
    item.date = null;
    save();
    renderChecklist();
    renderProgress();
    return;
  }
  // Show note modal
  pendingIndex = index;
  $noteInput.value = '';
  renderQuickPicks();
  $noteModal.classList.add('show');
}

// ── Quick Picks ──
const QUICK_PICKS = ['Josefina', 'Soledad', 'Paz', 'Flavia', 'Tarea del Cole', 'Pile'];
const $quickPicks = document.getElementById('quick-picks');

function renderQuickPicks() {
  $quickPicks.innerHTML = QUICK_PICKS.map((label) =>
    `<button class="quick-pick" data-label="${label}">${label}</button>`
  ).join('');

  $quickPicks.querySelectorAll('.quick-pick').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Select this pick and immediately complete
      completeItem(pendingIndex, btn.dataset.label);
      $noteModal.classList.remove('show');
    });
  });
}

// ── Note Modal ──
document.getElementById('note-skip').addEventListener('click', () => {
  completeItem(pendingIndex, '');
  $noteModal.classList.remove('show');
});

document.getElementById('note-save').addEventListener('click', () => {
  completeItem(pendingIndex, $noteInput.value.trim());
  $noteModal.classList.remove('show');
});

document.getElementById('note-cancel').addEventListener('click', () => {
  $noteModal.classList.remove('show');
});

function completeItem(index, note) {
  state.items[index].done = true;
  state.items[index].note = note;
  state.items[index].date = new Date().toISOString();
  save();

  // Animate the specific item instead of full re-render
  const itemEl = $grid.children[index];
  if (itemEl) {
    const circle = itemEl.querySelector('.check-circle');
    const emojiSpan = itemEl.querySelector('.emoji');
    const label = itemEl.querySelector('.check-label');

    // Add done class to trigger CSS transition (gray → color)
    itemEl.classList.add('done');

    // Burst animation on the circle
    circle.classList.add('burst');

    // Spawn sparkle particles around the circle
    spawnSparkles(circle);

    // Update label and add date
    label.textContent = note || 'Hecho';
    const existingDate = itemEl.querySelector('.check-date');
    if (existingDate) existingDate.remove();
    const dateEl = document.createElement('div');
    dateEl.className = 'check-date';
    dateEl.textContent = formatShortDate(state.items[index].date);
    itemEl.appendChild(dateEl);

    // Clean up burst class after animation
    setTimeout(() => circle.classList.remove('burst'), 600);
  } else {
    renderChecklist();
  }

  renderProgress();

  // Check if all done
  const done = state.items.filter((it) => it.done).length;
  if (done >= state.meta) {
    setTimeout(() => {
      $prizeInput.value = '';
      $prizeModal.classList.add('show');
      launchConfetti();
      setTimeout(() => $prizeInput.focus(), 100);
    }, 700);
  }
}

// ── Sparkle Burst ──
const SPARKLE_CHARS = ['✦', '✧', '★', '⚡', '💫', '✨'];
const SPARKLE_COLORS = ['#f59e0b', '#e94560', '#0d9488', '#f97316', '#7c3aed', '#2563eb'];

function spawnSparkles(circleEl) {
  const rect = circleEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 8; i++) {
    const spark = document.createElement('div');
    spark.className = 'sparkle';
    spark.textContent = SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)];
    spark.style.color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
    spark.style.left = cx + 'px';
    spark.style.top = cy + 'px';

    // Random direction
    const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
    const distance = 40 + Math.random() * 35;
    spark.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
    spark.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
    spark.style.setProperty('--rot', (Math.random() - 0.5) * 360 + 'deg');

    document.body.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove());
  }
}

// ── Prize Modal ──
document.getElementById('prize-save').addEventListener('click', () => {
  const prize = $prizeInput.value.trim();
  if (!prize) {
    $prizeInput.style.borderColor = '#ff4444';
    $prizeInput.placeholder = 'Escribe tu premio...';
    return;
  }
  // Save to history
  state.history.unshift({
    prize,
    emoji: state.roundEmoji,
    date: new Date().toISOString(),
    meta: state.meta,
    items: state.items.map((it) => ({ note: it.note }))
  });
  // Reset current round with fresh emojis
  state.items = [];
  state.roundEmoji = null;
  ensureItems();
  save();
  $prizeModal.classList.remove('show');
  renderBgPattern();
  renderChecklist();
  renderProgress();
  renderHistory();
});

// ── History ──
function renderHistory() {
  if (state.history.length === 0) {
    $historyList.innerHTML = '<div class="history-empty">Anton aun no ha ganado premios.<br>A completar la primera tanda!</div>';
    return;
  }
  $historyList.innerHTML = state.history
    .map((h) => {
      const d = new Date(h.date);
      const dateStr = d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
      const itemNotes = h.items
        .filter((it) => it.note)
        .map((it) => `<span class="item-note">${escapeHtml(it.note)}</span>`)
        .join(' · ');
      return `
        <div class="history-card">
          <div class="prize-name">${h.emoji || '🏆'} ${escapeHtml(h.prize)}</div>
          <div class="prize-date">${dateStr} · ${h.meta} completadas</div>
          ${itemNotes ? `<div class="prize-items">${itemNotes}</div>` : ''}
        </div>`;
    })
    .join('');
}

// ── Settings ──
function renderMeta() {
  $metaValue.textContent = state.meta;
}

document.getElementById('meta-minus').addEventListener('click', () => {
  if (state.meta > 1) {
    state.meta--;
    ensureItems();
    save();
    renderMeta();
    renderChecklist();
    renderProgress();
  }
});

document.getElementById('meta-plus').addEventListener('click', () => {
  if (state.meta < 50) {
    state.meta++;
    ensureItems();
    save();
    renderMeta();
    renderChecklist();
    renderProgress();
  }
});

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Seguro que quieres reiniciar la tanda actual? Se perderan las obligaciones marcadas.')) {
    state.items = [];
    state.roundEmoji = null;
    ensureItems();
    save();
    renderBgPattern();
    renderChecklist();
    renderProgress();
  }
});

document.getElementById('clear-history-btn').addEventListener('click', () => {
  if (confirm('Seguro que quieres borrar todo el historial de premios?')) {
    state.history = [];
    save();
    renderHistory();
  }
});

// ── Schedule ──
let editingPeriod = null; // { day, period }

function getTodayKey() {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon...
  return DAYS[jsDay - 1] || null;
}

function renderSchedule() {
  const todayKey = getTodayKey();
  const periods = state.schedule.periods;

  // Header row
  let html = '<div class="sched-table">';
  html += '<div class="sched-row sched-header-row">';
  html += '<div class="sched-cell sched-period-col">#</div>';
  DAYS.forEach((day) => {
    const isToday = day === todayKey;
    html += `<div class="sched-cell sched-day-col${isToday ? ' today' : ''}" style="--day-color: ${DAY_COLORS[day]}">
      <span class="sched-day-label">${DAY_SHORT[day]}</span>
      ${isToday ? '<span class="sched-today-dot"></span>' : ''}
    </div>`;
  });
  html += '</div>';

  // Period rows
  for (let p = 0; p < periods; p++) {
    html += '<div class="sched-row">';
    html += `<div class="sched-cell sched-period-col"><span class="sched-period-num">${p + 1}</span></div>`;
    DAYS.forEach((day) => {
      const subject = state.schedule[day][p] || '';
      const isToday = day === todayKey;
      html += `<div class="sched-cell sched-subject${isToday ? ' today' : ''}${subject ? ' filled' : ''}" style="--day-color: ${DAY_COLORS[day]}">
        ${subject ? escapeHtml(subject) : ''}
      </div>`;
    });
    html += '</div>';
  }
  html += '</div>';

  $scheduleWrap.innerHTML = html;
}

function renderScheduleEditor() {
  const periods = state.schedule.periods;

  // Periods control
  let html = `<div class="sched-edit-periods">
    <label>Horas por dia</label>
    <div class="meta-control">
      <button class="meta-btn" id="periods-minus">−</button>
      <div class="meta-value" id="periods-value">${periods}</div>
      <button class="meta-btn" id="periods-plus">+</button>
    </div>
  </div>`;

  // Editable table
  html += '<div class="sched-table sched-edit-table">';
  html += '<div class="sched-row sched-header-row">';
  html += '<div class="sched-cell sched-period-col">#</div>';
  DAYS.forEach((day) => {
    html += `<div class="sched-cell sched-day-col" style="--day-color: ${DAY_COLORS[day]}">
      <span class="sched-day-label">${DAY_SHORT[day]}</span>
    </div>`;
  });
  html += '</div>';

  for (let p = 0; p < periods; p++) {
    html += '<div class="sched-row">';
    html += `<div class="sched-cell sched-period-col"><span class="sched-period-num">${p + 1}</span></div>`;
    DAYS.forEach((day) => {
      const subject = state.schedule[day][p] || '';
      html += `<div class="sched-cell sched-subject-edit${subject ? ' filled' : ''}" data-day="${day}" data-period="${p}" style="--day-color: ${DAY_COLORS[day]}">
        ${subject ? escapeHtml(subject) : '<span class="sched-empty-slot">+</span>'}
      </div>`;
    });
    html += '</div>';
  }
  html += '</div>';

  $scheduleEditor.innerHTML = html;

  // Cell click → open modal
  $scheduleEditor.querySelectorAll('.sched-subject-edit').forEach((cell) => {
    cell.addEventListener('click', () => {
      editingDay = cell.dataset.day;
      editingPeriod = parseInt(cell.dataset.period);
      const current = state.schedule[editingDay][editingPeriod] || '';
      $subjectModalDay.textContent = `${DAY_LABELS[editingDay]} — Hora ${editingPeriod + 1}`;
      $subjectInput.value = current;
      $subjectModal.classList.add('show');
      setTimeout(() => { $subjectInput.focus(); $subjectInput.select(); }, 100);
    });
  });

  // Period +/- buttons
  document.getElementById('periods-minus').addEventListener('click', () => {
    if (state.schedule.periods > 1) {
      state.schedule.periods--;
      DAYS.forEach((d) => { state.schedule[d] = state.schedule[d].slice(0, state.schedule.periods); });
      save();
      renderScheduleEditor();
      renderSchedule();
    }
  });
  document.getElementById('periods-plus').addEventListener('click', () => {
    if (state.schedule.periods < 12) {
      state.schedule.periods++;
      DAYS.forEach((d) => { state.schedule[d].push(''); });
      save();
      renderScheduleEditor();
      renderSchedule();
    }
  });
}

// Subject modal — now handles both add and edit
document.getElementById('subject-save').addEventListener('click', () => {
  const subject = $subjectInput.value.trim();
  if (editingDay == null || editingPeriod == null) return;
  state.schedule[editingDay][editingPeriod] = subject; // empty string clears it
  save();
  $subjectModal.classList.remove('show');
  renderScheduleEditor();
  renderSchedule();
});

document.getElementById('subject-cancel').addEventListener('click', () => {
  $subjectModal.classList.remove('show');
});

$subjectInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('subject-save').click();
  }
});

// ── Section Switching ──
const SECTION_TITLES = { premios: 'Premios de', horario: 'Horario de' };

$sectionTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.section;
    $sectionTabs.forEach((t) => t.classList.toggle('active', t === tab));
    $sections.forEach((s) => s.classList.toggle('active', s.id === 'section-' + target));
    $titleLine1.textContent = SECTION_TITLES[target] || 'Anton';
  });
});

// ── Page Navigation (within each section) ──
document.querySelectorAll('.bottom-nav').forEach((nav) => {
  const section = nav.closest('.section');
  const pages = section.querySelectorAll('.page');
  const btns = nav.querySelectorAll('.nav-btn');
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;
      pages.forEach((p) => p.classList.toggle('active', p.id === target));
      btns.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });
});

// ── Confetti ──
function launchConfetti() {
  const canvas = $confetti;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#e94560', '#f59e0b', '#f97316', '#7c3aed', '#0d9488', '#2563eb'];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 1) * 14,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      life: 1
    });
  }

  let frame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach((p) => {
      p.x += p.vx;
      p.vy += 0.3;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.life -= 0.012;
      if (p.life <= 0) return;
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (alive) {
      frame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  animate();
}

// ── Utils ──
function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Service Worker ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ── Start ──
init();
