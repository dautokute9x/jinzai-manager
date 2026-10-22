// Drive/Sheets/Apps Script giả lập dùng chung cho các test server (không chạm Google thật).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function makeGoogle() {
  let nextId = 1;
  const clock = { now: '2026-10-19 12:00:00' };
  const items = {}; // id -> folder | file
  const props = {};
  const triggers = [];
  const session = { active: 'owner@example.test' };
  const lock = { busy: false }; // true = như có lần chạy khác đang giữ khóa
  const newId = () => 'id' + nextId++;

  function folder(name, parent) {
    const f = { kind: 'folder', id: newId(), name, parent, trashed: false,
      getId: () => f.id, getUrl: () => 'https://drive/' + f.id, isTrashed: () => f.trashed,
      createFolder: (n) => folder(n, f),
      getFoldersByName: (n) => {
        const list = Object.values(items).filter((x) => x.kind === 'folder' && x.parent === f && x.name === n && !x.trashed);
        let i = 0;
        return { hasNext: () => i < list.length, next: () => list[i++] };
      },
      createFile: (blob) => {
        const file = { kind: 'file', id: newId(), name: blob.name, parent: f, trashed: false, bytes: blob.bytes, mime: blob.mime,
          getId: () => file.id, getUrl: () => 'https://drive/file/' + file.id, isTrashed: () => file.trashed };
        items[file.id] = file; return file;
      },
      getFiles: () => {
        const list = Object.values(items).filter((x) => x.kind === 'file' && x.parent === f);
        let i = 0;
        return { hasNext: () => i < list.length, next: () => list[i++] };
      } };
    items[f.id] = f; return f;
  }
  function sheet(name, ss) {
    const s = { name, rows: [], frozen: 0, protections: [], textRows: new Set(), maxRows: 1000, maxCols: 26, formatCalls: 0, reads: 0,
      getName: () => s.name, getLastRow: () => s.rows.length,
      getMaxRows: () => s.maxRows,
      getMaxColumns: () => s.maxCols,
      insertColumnsAfter: (after, n) => { s.maxCols += n; },
      insertRowsAfter: (after, n) => { s.maxRows += n; },
      setFrozenRows: (n) => { s.frozen = n; },
      getProtections: () => s.protections.slice(),
      protect: () => { const p = { warningOnly: false, setWarningOnly: (v) => { p.warningOnly = v; return p; }, setDescription: () => p }; s.protections.push(p); return p; },
      getRange: (r, c, nr = 1, nc = 1) => {
        const range = {
          setValues: (vals) => { vals.forEach((row, i) => { s.rows[r - 1 + i] = Array.from(row); }); s.maxRows = Math.max(s.maxRows, s.rows.length); return range; },
          getValues: () => (s.reads++, 0) || Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => ((s.rows[r - 1 + i] || [])[c - 1 + j] ?? ''))),
          getValue: () => (s.rows[r - 1] || [])[c - 1],
          setValue: (v) => { s.rows[r - 1] = s.rows[r - 1] || []; s.rows[r - 1][c - 1] = v; return range; },
          setFontWeight: () => range,
          setNumberFormat: (f) => { s.formatCalls++; if (f === '@') for (let i = 0; i < nr; i++) s.textRows.add(r + i); return range; },
        };
        return range;
      } };
    return s;
  }
  function spreadsheet(name) {
    const ss = { kind: 'file', id: newId(), name, parent: null, trashed: false, sheets: [],
      getId: () => ss.id, getName: () => ss.name, getUrl: () => 'https://sheets/' + ss.id, isTrashed: () => ss.trashed,
      getSheets: () => ss.sheets.slice(),
      getSheetByName: (n) => ss.sheets.find((x) => x.name === n) || null,
      insertSheet: (n) => { const s = sheet(n, ss); ss.sheets.push(s); return s; },
      deleteSheet: (s) => { assert(ss.sheets.length > 1, 'không được xóa tab cuối'); ss.sheets = ss.sheets.filter((x) => x !== s); },
      moveTo: (f) => { ss.parent = f; },
      setName: (n) => { ss.name = n; },
      setTrashed: (v) => { ss.trashed = v; },
      makeCopy: (n, f) => {
        const c = spreadsheet(n);
        c.parent = f;
        c.sheets = ss.sheets.map((s) => { const k = sheet(s.name, c); k.rows = s.rows.map((r) => r.slice()); k.protections = s.protections.slice(); return k; });
        return c;
      } };
    ss.sheets.push(sheet('Sheet1', ss));
    items[ss.id] = ss; return ss;
  }
  const get = (id) => { if (!items[id]) throw new Error('not found'); return items[id]; };

  return {
    lock,
    items, props, clock, triggers, session,
    globals: {
      DriveApp: { createFolder: (n) => folder(n, null), getFolderById: get, getFileById: get },
      SpreadsheetApp: { create: spreadsheet, openById: get, flush: () => {}, ProtectionType: { SHEET: 'SHEET' } },
      // Đủ cho doGet: trang từ chối (createHtmlOutput) hoặc trang chính (template).
      HtmlService: {
        createHtmlOutput: (html) => { const o = { html, title: '', setTitle: (t) => { o.title = t; return o; } }; return o; },
        createTemplateFromFile: (name) => { const tpl = { name, evaluate: () => { const o = { tpl, setTitle: () => o, addMetaTag: () => o }; return o; } }; return tpl; },
      },
      PropertiesService: { getScriptProperties: () => ({ getProperties: () => Object.assign({}, props), getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; } }) },
      LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => !lock.busy, releaseLock: () => {} }) },
      // Giờ giả lập lấy từ clock.now ('yyyy-MM-dd HH:mm:ss', coi là JST), định dạng theo mẫu.
      Utilities: {
        sleep: () => {},
        formatDate: (date, tz, pattern) => {
          const [d, t] = clock.now.split(' ');
          const [yyyy, MM, dd] = d.split('-');
          const [HH, mm, ss] = t.split(':');
          const parts = { yyyy, MM, dd, HH, mm, ss };
          return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, (k) => parts[k]);
        },
        getUuid: () => 'uuid-' + nextId++ + '-' + 'a'.repeat(24),
        computeDigest: (alg, s) => Array.from(require('crypto').createHash('sha256').update(String(s), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
        DigestAlgorithm: { SHA_256: 'SHA_256' },
        Charset: { UTF_8: 'UTF_8' },
        // Như Apps Script: mảng byte có dấu (-128..127).
        base64Decode: (s) => Array.from(Buffer.from(s, 'base64')).map((b) => (b > 127 ? b - 256 : b)),
        newBlob: (bytes, mime, name) => ({ bytes, mime, name }),
      },
      ScriptApp: {
        getProjectTriggers: () => triggers.slice(),
        getService: () => ({ getUrl: () => 'https://script.example.test/exec' }),
        newTrigger: (handler) => {
          const t = { handler, getHandlerFunction: () => handler, uid: 'trg-' + (triggers.length + 1) };
          t.getUniqueId = () => t.uid;
          const b = { timeBased: () => b, everyDays: (n) => { t.everyDays = n; return b; }, atHour: (h) => { t.hour = h; return b; },
            nearMinute: (m) => { t.minute = m; return b; }, inTimezone: (z) => { t.tz = z; return b; }, create: () => { triggers.push(t); return t; } };
          return b;
        },
      },
      // session.active: email người đang gọi ('' = người dùng Gmail khác, Google không cho biết email).
      Session: { getActiveUser: () => ({ getEmail: () => session.active }), getEffectiveUser: () => ({ getEmail: () => 'owner@example.test' }) },
    },
  };
}

function load(g, files) {
  const ctx = vm.createContext({ ...g.globals });
  // Auth.gs (GĐ 10: kiểm quyền) luôn có trong project thật → luôn nạp.
  let list = files.indexOf('Auth.gs') >= 0 ? files : files.concat(['Auth.gs']);
  // GĐ 11.2: Application.gs gọi 受入れ前 (Prep.gs) + mẫu giấy tờ (Visa.gs) — trong project thật luôn có đủ.
  if (list.indexOf('Application.gs') >= 0) ['Visa.gs', 'Prep.gs'].forEach((f) => { if (list.indexOf(f) < 0) list = list.concat([f]); });
  if (list.indexOf('Dashboard.gs') >= 0 && list.indexOf('Mendan.gs') < 0) list = list.concat(['Mendan.gs']); // 定期面談 theo quý (GĐ 11.3)
  for (const f of list) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), ctx);
  return ctx;
}

// Mảng tạo trong vm khác "realm" với test: so sánh qua JSON.
const eq = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));

module.exports = { makeGoogle, load, eq };
