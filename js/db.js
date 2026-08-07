const IDB_NAME = "ritual-store";
const IDB_STORE = "sqlite";
const IDB_KEY = "db-blob";

let SQL = null;
let db = null;

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadBlob() {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveBlob(bytes) {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK(type IN ('simple','timed')),
  period TEXT CHECK(period IN ('weekly','monthly')),
  goal_hours REAL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  hours REAL,
  UNIQUE(habit_id, date)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS celebrations (
  habit_id INTEGER NOT NULL,
  period_key TEXT NOT NULL,
  UNIQUE(habit_id, period_key)
);
`;

export async function initDb() {
  SQL = await initSqlJs({ locateFile: (f) => `vendor/${f}` });
  const existing = await loadBlob();
  db = existing ? new SQL.Database(new Uint8Array(existing)) : new SQL.Database();
  db.run(SCHEMA);
  await persist();
  return db;
}

export async function persist() {
  const bytes = db.export();
  await saveBlob(bytes);
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
}

export async function getSetting(key, fallback) {
  const rows = all("SELECT value FROM settings WHERE key = ?", [key]);
  return rows.length ? rows[0].value : fallback;
}

export async function setSetting(key, value) {
  run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
  await persist();
}

export function listHabits() {
  return all("SELECT * FROM habits WHERE archived = 0 ORDER BY sort_order ASC, id ASC");
}

export async function createHabit(h) {
  const maxRow = all("SELECT COALESCE(MAX(sort_order), -1) AS m FROM habits");
  const nextOrder = maxRow[0].m + 1;
  run(
    `INSERT INTO habits (title, description, type, period, goal_hours, color, sort_order, archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [h.title, h.description || "", h.type, h.period || null, h.goalHours ?? null, h.color, nextOrder, new Date().toISOString()]
  );
  await persist();
}

export async function updateHabit(id, h) {
  run(
    `UPDATE habits SET title = ?, description = ?, type = ?, period = ?, goal_hours = ?, color = ? WHERE id = ?`,
    [h.title, h.description || "", h.type, h.period || null, h.goalHours ?? null, h.color, id]
  );
  await persist();
}

export async function archiveHabit(id) {
  run("UPDATE habits SET archived = 1 WHERE id = ?", [id]);
  await persist();
}

export function getEntry(habitId, date) {
  const rows = all("SELECT * FROM entries WHERE habit_id = ? AND date = ?", [habitId, date]);
  return rows[0] || null;
}

export async function setEntry(habitId, date, done, hours) {
  run(
    `INSERT INTO entries (habit_id, date, done, hours) VALUES (?, ?, ?, ?)
     ON CONFLICT(habit_id, date) DO UPDATE SET done = excluded.done, hours = excluded.hours`,
    [habitId, date, done ? 1 : 0, hours ?? null]
  );
  await persist();
}

export function getEntriesInRange(habitId, startDate, endDate) {
  return all(
    "SELECT * FROM entries WHERE habit_id = ? AND date >= ? AND date <= ? ORDER BY date ASC",
    [habitId, startDate, endDate]
  );
}

export function getRecentEntries(habitId, sinceDate) {
  return all(
    "SELECT date, done FROM entries WHERE habit_id = ? AND date >= ? AND done = 1 ORDER BY date DESC",
    [habitId, sinceDate]
  );
}

export function hasCelebrated(habitId, periodKey) {
  const rows = all("SELECT 1 FROM celebrations WHERE habit_id = ? AND period_key = ?", [habitId, periodKey]);
  return rows.length > 0;
}

export async function markCelebrated(habitId, periodKey) {
  run("INSERT OR IGNORE INTO celebrations (habit_id, period_key) VALUES (?, ?)", [habitId, periodKey]);
  await persist();
}
