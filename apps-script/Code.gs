/**
 * Delivery Quiz backend: stores answers in this Google Sheet.
 *
 * Setup (see README.md for the full steps):
 *  1. Open the Sheet > Extensions > Apps Script, paste this file in as Code.gs.
 *  2. Project Settings > Script properties > add ADMIN_PASSWORD.
 *  3. Deploy > New deployment > Web app: Execute as "Me", Who has access "Anyone".
 *
 * The admin password lives only in Script properties, never in the website code.
 */

// The list of phases lives in config.js on the website. This script accepts any list
// of up to MAX_PHASES distinct phase names, so adding or removing a phase there needs
// no change or redeploy here.
const MAX_PHASES = 30;

const SHEET_NAME = "Submissions";
const HEADER = ["Submitted at", "Team", "Total days", "Browser ID", "Answer (JSON)"]
  .concat(Array.from({ length: MAX_PHASES }, (_, i) => "Step " + (i + 1)));

function doGet() {
  return json(status_());
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return json({ ok: false, error: "bad_request" }); }

  switch (req.action) {
    case "status": return json(status_());
    case "submit": return submit_(req);
  }

  const auth = checkPassword_(req.password);
  if (auth) return json({ ok: false, error: auth });

  switch (req.action) {
    case "results": return results_();
    case "saveKey": return saveKey_(req.key);
    case "newRound":
      props_().setProperty("RESET_AT", String(Date.now()));
      return json({ ok: true });
    case "setOpen":
      props_().setProperty("OPEN", req.open ? "true" : "false");
      return json({ ok: true, open: !!req.open });
    default:
      return json({ ok: false, error: "bad_request" });
  }
}

/* ---------- Participant ---------- */

function submit_(req) {
  if (!isOpen_()) return json({ ok: false, error: "closed" });

  const team = String(req.team || "").trim().slice(0, 60);
  const clientId = String(req.clientId || "").slice(0, 64);
  const steps = req.steps;
  if (!team || !Array.isArray(steps) || steps.length < 1 || steps.length > MAX_PHASES) {
    return json({ ok: false, error: "bad_request" });
  }
  const seen = {};
  for (const s of steps) {
    if (!s || !validPhase_(s.phase) || seen[s.phase]) return json({ ok: false, error: "bad_request" });
    if (!Number.isInteger(s.days) || s.days < 0 || s.days > 999) return json({ ok: false, error: "bad_request" });
    seen[s.phase] = true;
  }
  const clean = steps.map(s => ({ phase: s.phase, days: s.days }));
  const total = clean.reduce((sum, s) => sum + s.days, 0);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet_().appendRow(
      [new Date(), team, total, clientId, JSON.stringify(clean)]
        .concat(clean.map(s => s.phase + " (" + s.days + "d)"))
    );
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

/* ---------- Admin ---------- */

// Answers submitted since the current round started.
function roundSubmissions_() {
  const resetAt = Number(props_().getProperty("RESET_AT") || 0);
  const values = sheet_().getDataRange().getValues();
  const submissions = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const at = row[0] instanceof Date ? row[0].getTime() : Number(new Date(row[0]));
    if (!at || at <= resetAt) continue;
    let steps = [];
    try { steps = JSON.parse(row[4]); } catch (err) { continue; }
    submissions.push({ submittedAt: at, team: String(row[1]), total: Number(row[2]), clientId: String(row[3]), steps: steps });
  }
  return submissions;
}

function results_() {
  const resetAt = Number(props_().getProperty("RESET_AT") || 0);
  const submissions = roundSubmissions_();
  const keyRaw = props_().getProperty("KEY");
  return json({
    ok: true,
    open: isOpen_(),
    resetAt: resetAt,
    key: keyRaw ? JSON.parse(keyRaw) : null,
    submissions: submissions
  });
}

function saveKey_(key) {
  if (!key || !Array.isArray(key.order) || key.order.length < 1 || key.order.length > MAX_PHASES) return json({ ok: false, error: "bad_request" });
  const seen = {};
  for (const p of key.order) {
    if (!validPhase_(p) || seen[p]) return json({ ok: false, error: "bad_request" });
    seen[p] = true;
  }
  const days = {};
  for (const p of key.order) {
    const d = key.days ? key.days[p] : null;
    // null (or missing) means "TBD": the step counts for order but not for days.
    if (d === null || d === undefined) { days[p] = null; continue; }
    if (!Number.isInteger(d) || d < 0 || d > 999) return json({ ok: false, error: "bad_request" });
    days[p] = d;
  }
  // Optional "any order" blocks: lists of phases that can be arranged freely among themselves.
  const groups = [];
  const grouped = {};
  if (key.groups !== undefined) {
    if (!Array.isArray(key.groups) || key.groups.length > 10) return json({ ok: false, error: "bad_request" });
    for (const g of key.groups) {
      if (!Array.isArray(g) || g.length < 2) return json({ ok: false, error: "bad_request" });
      for (const p of g) {
        if (!seen[p] || grouped[p]) return json({ ok: false, error: "bad_request" });
        grouped[p] = true;
      }
      groups.push(g.slice());
    }
  }
  const w = Math.max(0, Math.min(100, Number(key.orderWeight)));
  props_().setProperty("KEY", JSON.stringify({ order: key.order, days: days, groups: groups, orderWeight: isNaN(w) ? 50 : w, updatedAt: Date.now() }));
  return json({ ok: true });
}

/* ---------- Helpers ---------- */

function validPhase_(p) {
  return typeof p === "string" && p.trim().length > 0 && p.length <= 100;
}

function checkPassword_(given) {
  const real = props_().getProperty("ADMIN_PASSWORD");
  if (!real) return "no_password";

  // Slow down guessing: after 20 wrong tries in 10 minutes, refuse for a while.
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get("pw_fails") || 0);
  if (fails >= 20) { Utilities.sleep(1000); return "unauthorized"; }

  if (typeof given === "string" && given === real) return null;
  cache.put("pw_fails", String(fails + 1), 600);
  Utilities.sleep(800);
  return "unauthorized";
}

// What every participant's phone checks: is the quiz open, and which round is running.
// Once submissions are closed, it also carries the answer key so phones can show results.
function status_() {
  const open = isOpen_();
  const out = { ok: true, open: open, round: Number(props_().getProperty("RESET_AT") || 0) };
  if (!open) {
    const keyRaw = props_().getProperty("KEY");
    if (keyRaw) {
      out.key = JSON.parse(keyRaw);
      // Anonymous answers (team + steps) so phones can build the team leaderboard.
      out.submissions = roundSubmissions_().map(s => ({ submittedAt: s.submittedAt, team: s.team, clientId: s.clientId, steps: s.steps }));
    }
  }
  return out;
}

function isOpen_() {
  return props_().getProperty("OPEN") !== "false";
}

function props_() {
  return PropertiesService.getScriptProperties();
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
