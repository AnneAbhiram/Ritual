import * as DB from "./db.js";
import { todayStr, addDays, periodRange, formatHeaderDate } from "./dates.js";
import { randomQuote } from "./quotes.js";
import { playCelebrationChime } from "./audio.js";

const COLORS = [
  "--tag-rose", "--tag-tangerine", "--tag-gold", "--tag-lime",
  "--tag-teal", "--tag-sky", "--tag-violet", "--tag-orchid",
];

const state = {
  habits: [],
  weekStart: "monday",
  today: todayStr(),
  editingId: null,
  draftType: "simple",
  draftGoalOn: false,
  draftColor: COLORS[0],
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

async function boot() {
  await DB.initDb();
  state.weekStart = await DB.getSetting("week_start", "monday");
  await refreshHabits();
  $("#today-date").textContent = formatHeaderDate(state.today);
  wireGlobalEvents();
  render();
}

async function refreshHabits() {
  state.habits = DB.listHabits();
}

function computeStreak(habitId) {
  const since = addDays(state.today, -370);
  const done = new Set(DB.getRecentEntries(habitId, since).map((r) => r.date));
  let cursor = done.has(state.today) ? state.today : addDays(state.today, -1);
  let streak = 0;
  while (done.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function computePeriodHours(habit) {
  const { start, end, key } = periodRange(habit, state.today, state.weekStart);
  const rows = DB.getEntriesInRange(habit.id, start, end);
  const sum = rows.reduce((acc, r) => acc + (r.hours || 0), 0);
  return { sum, start, end, key };
}

function render() {
  renderSummary();
  renderList();
}

function renderSummary() {
  const total = state.habits.length;
  let doneCount = 0;
  let bestStreak = 0;
  for (const h of state.habits) {
    const entry = DB.getEntry(h.id, state.today);
    if (entry && entry.done) doneCount++;
    const s = computeStreak(h.id);
    if (s > bestStreak) bestStreak = s;
  }
  $("#summary-bar").innerHTML = `
    <div class="summary-chip"><div class="n">${doneCount}/${total}</div><div class="l">done today</div></div>
    <div class="summary-chip"><div class="n">${bestStreak}🔥</div><div class="l">best streak</div></div>
  `;
}

function renderList() {
  const list = $("#habit-list");
  if (!state.habits.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="big">🌱</div>
        <div>No habits yet. Tap + to plant your first one.</div>
      </div>`;
    return;
  }

  list.innerHTML = state.habits.map((h) => renderCard(h)).join("");
}

function renderCard(h) {
  const entry = DB.getEntry(h.id, state.today);
  const done = !!(entry && entry.done);
  const hours = entry && entry.hours != null ? entry.hours : 0;
  const streak = computeStreak(h.id);
  const accent = `var(${h.color})`;

  let timedBlock = "";
  if (h.type === "timed") {
    const sliderMax = Math.max(8, h.goal_hours ? Math.ceil(h.goal_hours) : 8);
    const hoursPanel = done
      ? `<div class="hours-panel">
           <div class="hp-top">
             <span class="hp-label">Time spent today</span>
             <span class="hp-val" data-hours-readout>${hours.toFixed(2)} hrs</span>
           </div>
           <input type="range" min="0" max="${sliderMax}" step="0.25" value="${hours}"
             data-habit-id="${h.id}" data-hours-slider />
         </div>`
      : "";

    let progressBlock = "";
    if (h.goal_hours) {
      const { sum, key } = computePeriodHours(h);
      const pct = Math.min(100, Math.round((sum / h.goal_hours) * 100));
      const periodLabel = h.period === "weekly" ? "this week" : "this month";
      progressBlock = `
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-label"><span>${periodLabel}</span><span><b>${sum.toFixed(1)}</b> / ${h.goal_hours} hrs</span></div>`;
    }

    timedBlock = `<div class="timed-block">${hoursPanel}${progressBlock}</div>`;
  }

  return `
    <div class="habit-card ${done ? "done" : ""}" style="--accent:${accent}" data-habit-id="${h.id}">
      <div class="habit-top">
        <div>
          <p class="habit-title">${escapeHtml(h.title)}</p>
          ${h.description ? `<p class="habit-desc">${escapeHtml(h.description)}</p>` : ""}
          <div class="habit-meta">
            <span class="streak-pill">🔥 <b>${streak}</b> day streak</span>
            ${h.type === "timed" ? `<span class="streak-pill">⏱ timed</span>` : ""}
          </div>
        </div>
        <button class="check-btn ${done ? "on" : ""}" data-toggle-id="${h.id}">✓</button>
      </div>
      ${timedBlock}
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function onToggle(habitId) {
  const h = state.habits.find((x) => x.id === habitId);
  const entry = DB.getEntry(habitId, state.today);
  const nowDone = !(entry && entry.done);
  const hours = nowDone ? (entry && entry.hours != null ? entry.hours : 0) : null;
  await DB.setEntry(habitId, state.today, nowDone, h.type === "timed" ? hours : null);
  render();
  if (h.type === "timed" && h.goal_hours) await checkCelebration(h);
}

async function onSlider(habitId, value) {
  const h = state.habits.find((x) => x.id === habitId);
  await DB.setEntry(habitId, state.today, true, parseFloat(value));
  render();
  if (h.goal_hours) await checkCelebration(h);
}

async function checkCelebration(h) {
  const { sum, key } = computePeriodHours(h);
  if (sum >= h.goal_hours && !DB.hasCelebrated(h.id, key)) {
    await DB.markCelebrated(h.id, key);
    playCelebrationChime();
    showToast(`🎉 "${h.title}" goal reached!`, randomQuote());
  }
}

function showToast(title, quote) {
  const toast = $("#toast");
  toast.innerHTML = `<div class="t-title">${title}</div><div class="t-quote">${quote}</div>`;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 5200);
}

function wireGlobalEvents() {
  $("#habit-list").addEventListener("click", (e) => {
    const toggleBtn = e.target.closest("[data-toggle-id]");
    if (toggleBtn) {
      onToggle(parseInt(toggleBtn.dataset.toggleId, 10));
      return;
    }
    const card = e.target.closest(".habit-card");
    if (card && !e.target.closest("[data-hours-slider]")) {
      openEditSheet(parseInt(card.dataset.habitId, 10));
    }
  });

  $("#habit-list").addEventListener("input", (e) => {
    const slider = e.target.closest("[data-hours-slider]");
    if (!slider) return;
    const readout = slider.closest(".hours-panel").querySelector("[data-hours-readout]");
    readout.textContent = `${parseFloat(slider.value).toFixed(2)} hrs`;
  });

  $("#habit-list").addEventListener("change", (e) => {
    const slider = e.target.closest("[data-hours-slider]");
    if (!slider) return;
    onSlider(parseInt(slider.dataset.habitId, 10), slider.value);
  });

  $("#fab-add").addEventListener("click", () => openAddSheet());
  $("#btn-settings").addEventListener("click", () => openSettingsSheet());
  $("#sheet-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "sheet-backdrop") closeSheet();
  });
}

function openAddSheet() {
  state.editingId = null;
  state.draftType = "simple";
  state.draftGoalOn = false;
  state.draftColor = COLORS[state.habits.length % COLORS.length];
  state.draft = { title: "", description: "", period: "weekly", goalHours: 5 };
  renderHabitSheet();
  openSheetEl();
  setTimeout(() => $("#f-title")?.focus(), 80);
}

function openEditSheet(id) {
  const h = state.habits.find((x) => x.id === id);
  if (!h) return;
  state.editingId = id;
  state.draftType = h.type;
  state.draftGoalOn = !!h.goal_hours;
  state.draftColor = h.color;
  state.draft = {
    title: h.title,
    description: h.description,
    period: h.period || "weekly",
    goalHours: h.goal_hours || 5,
  };
  renderHabitSheet(h);
  openSheetEl();
}

function syncDraftFromDom() {
  const t = $("#f-title");
  const d = $("#f-desc");
  const p = $("#f-period");
  const g = $("#f-goal");
  if (t) state.draft.title = t.value;
  if (d) state.draft.description = d.value;
  if (p) state.draft.period = p.value;
  if (g) state.draft.goalHours = g.value;
}

function renderHabitSheet(h) {
  const { title, description: desc, period, goalHours } = state.draft;

  $("#sheet-content").innerHTML = `
    <h2>${h ? "Edit habit" : "New habit"}</h2>
    <div class="field">
      <label>Title</label>
      <input type="text" id="f-title" value="${escapeHtml(title)}" placeholder="e.g. Guitar practice" />
    </div>
    <div class="field">
      <label>Description</label>
      <textarea id="f-desc" placeholder="Why this habit matters, or what counts">${escapeHtml(desc)}</textarea>
    </div>
    <div class="field">
      <label>Type</label>
      <div class="type-toggle">
        <button type="button" id="type-simple" class="${state.draftType === "simple" ? "active" : ""}">Simple (tick)</button>
        <button type="button" id="type-timed" class="${state.draftType === "timed" ? "active" : ""}">Timed (log hours)</button>
      </div>
    </div>
    <div id="goal-section" style="${state.draftType === "timed" ? "" : "display:none"}">
      <div class="toggle-row">
        <div>
          <div class="s-label">Set a goal</div>
          <div class="s-sub">Track cumulative hours toward a target</div>
        </div>
        <div class="switch ${state.draftGoalOn ? "on" : ""}" id="goal-switch"><div class="knob"></div></div>
      </div>
      <div id="goal-fields" style="${state.draftGoalOn ? "" : "display:none"}">
        <div class="goal-row">
          <div class="field">
            <label>Period</label>
            <select id="f-period">
              <option value="weekly" ${period === "weekly" ? "selected" : ""}>Weekly</option>
              <option value="monthly" ${period === "monthly" ? "selected" : ""}>Monthly</option>
            </select>
          </div>
          <div class="field">
            <label>Goal (hours)</label>
            <input type="number" id="f-goal" min="0.5" step="0.5" value="${goalHours}" />
          </div>
        </div>
      </div>
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-swatches">
        ${COLORS.map((c) => `<div class="swatch ${c === state.draftColor ? "selected" : ""}" data-color="${c}" style="background:var(${c})"></div>`).join("")}
      </div>
    </div>
    <div class="sheet-actions">
      ${h ? `<button class="btn btn-danger" id="btn-delete">Delete</button>` : ""}
      <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
      <button class="btn btn-primary" id="btn-save">${h ? "Save" : "Create"}</button>
    </div>
  `;

  $("#type-simple").addEventListener("click", () => {
    syncDraftFromDom();
    state.draftType = "simple";
    renderHabitSheet(h);
  });
  $("#type-timed").addEventListener("click", () => {
    syncDraftFromDom();
    state.draftType = "timed";
    renderHabitSheet(h);
  });
  const goalSwitch = $("#goal-switch");
  if (goalSwitch) {
    goalSwitch.addEventListener("click", () => {
      syncDraftFromDom();
      state.draftGoalOn = !state.draftGoalOn;
      renderHabitSheet(h);
    });
  }
  $$(".swatch").forEach((sw) =>
    sw.addEventListener("click", () => {
      syncDraftFromDom();
      state.draftColor = sw.dataset.color;
      renderHabitSheet(h);
    })
  );
  $("#btn-cancel").addEventListener("click", closeSheet);
  $("#btn-save").addEventListener("click", () => saveHabitFromForm(h));
  const delBtn = $("#btn-delete");
  if (delBtn) delBtn.addEventListener("click", () => deleteHabit(h.id));
}

async function saveHabitFromForm(existing) {
  const title = $("#f-title").value.trim();
  if (!title) {
    $("#f-title").focus();
    return;
  }
  const description = $("#f-desc").value.trim();
  const type = state.draftType;
  const goalOn = type === "timed" && state.draftGoalOn;
  const period = goalOn ? $("#f-period").value : null;
  const goalHours = goalOn ? parseFloat($("#f-goal").value) || null : null;
  const color = state.draftColor;

  const payload = { title, description, type, period, goalHours, color };
  if (existing) {
    await DB.updateHabit(existing.id, payload);
  } else {
    await DB.createHabit(payload);
  }
  await refreshHabits();
  closeSheet();
  render();
}

async function deleteHabit(id) {
  await DB.archiveHabit(id);
  await refreshHabits();
  closeSheet();
  render();
}

function openSettingsSheet() {
  $("#sheet-content").innerHTML = `
    <h2>Settings</h2>
    <div class="settings-list">
      <div class="settings-row">
        <div>
          <div class="s-label">Week starts on</div>
          <div class="s-sub">Used for weekly goal periods</div>
        </div>
        <div class="seg" id="week-seg">
          <button type="button" data-val="monday" class="${state.weekStart === "monday" ? "active" : ""}">Mon</button>
          <button type="button" data-val="sunday" class="${state.weekStart === "sunday" ? "active" : ""}">Sun</button>
        </div>
      </div>
    </div>
    <div class="sheet-actions">
      <button class="btn btn-primary" id="btn-close-settings">Done</button>
    </div>
  `;
  $$("#week-seg button").forEach((b) =>
    b.addEventListener("click", async () => {
      state.weekStart = b.dataset.val;
      await DB.setSetting("week_start", state.weekStart);
      openSettingsSheet();
      render();
    })
  );
  $("#btn-close-settings").addEventListener("click", closeSheet);
  openSheetEl();
}

function openSheetEl() {
  $("#sheet-backdrop").classList.add("open");
}
function closeSheet() {
  $("#sheet-backdrop").classList.remove("open");
}

boot();
