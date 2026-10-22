// Bước 1.5: sao lưu & khôi phục (D-017, D-040).
// Luôn sao lưu theo CẶP (file chính + file nhạy cảm) để khôi phục không bị lệch nhau.
const BACKUP_KINDS = ['auto', 'manual', 'pre-restore', 'pre-upgrade']; // pre-upgrade: trước khi nối cột (bước 2.1)
const BACKUP_KEEP_MONTHS = 12;
const BACKUP_STALE_DAYS = 16;
const BACKUP_HANDLER = 'runScheduledBackup';
const BACKUP_FILES = ['DATA', 'SENSITIVE'];
// Tên bản sao: <tên file>__<yyyy-MM-dd>_<HHmmss>__<loại>
const BACKUP_RE = /^(.+)__(\d{4}-\d{2}-\d{2})_(\d{6})__([a-z-]+)$/;

function stateKey_(key) { return ENV + '_' + key; }

function jst_(date, pattern) { return Utilities.formatDate(date, 'Asia/Tokyo', pattern); }

function backupFolders_(props, created) {
  const root = findSaved_(props, 'ROOT_FOLDER', (id) => DriveApp.getFolderById(id));
  if (!root) throw new Error('NOT_INITIALIZED');
  const backup = getOrCreateFolder_(props, 'BACKUP_FOLDER', root, created || []);
  return { root: root, backup: backup };
}

function listBackupFiles_(folder) {
  const out = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const m = !f.isTrashed() && f.getName().match(BACKUP_RE);
    if (m) out.push({ file: f, base: m[1], date: m[2], time: m[3], kind: m[4], key: m[2] + '_' + m[3] + '__' + m[4] });
  }
  return out;
}

// Ngày cuối tháng tính bằng số, không phụ thuộc múi giờ máy chủ.
function isBackupDay_(ymd) {
  const p = ymd.split('-').map(Number);
  const lastDay = new Date(Date.UTC(p[0], p[1], 0)).getUTCDate();
  return p[2] === 15 || p[2] === lastDay;
}

function monthsAgo_(ymd, months) {
  const p = ymd.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1 - months, 1));
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(Math.min(p[2], lastDay)).padStart(2, '0');
}

function backupNow_(kind) {
  if (BACKUP_KINDS.indexOf(kind) < 0) throw new Error('UNKNOWN_KIND|' + kind);
  const props = scriptProps_();
  const folders = backupFolders_(props);
  const now = new Date();
  const stamp = jst_(now, 'yyyy-MM-dd_HHmmss');
  BACKUP_FILES.forEach((key) => {
    const file = findSaved_(props, key, (id) => DriveApp.getFileById(id));
    if (!file) throw new Error('NOT_INITIALIZED');
    file.makeCopy(NAMES[key] + '__' + stamp + '__' + kind, folders.backup);
  });
  props.setProperty(stateKey_('BACKUP_LAST_OK'), jst_(now, 'yyyy-MM-dd HH:mm:ss'));
  props.deleteProperty(stateKey_('BACKUP_LAST_ERROR'));
  cleanupOldBackups_(folders.backup, jst_(now, 'yyyy-MM-dd'));
  return stamp + '__' + kind;
}

// Bản quá 12 tháng → thùng rác Drive (không xóa hẳn; Drive tự xóa sau 30 ngày).
function cleanupOldBackups_(folder, todayYmd) {
  const cutoff = monthsAgo_(todayYmd, BACKUP_KEEP_MONTHS);
  let trashed = 0;
  listBackupFiles_(folder).forEach((b) => {
    if (b.date < cutoff) { b.file.setTrashed(true); trashed++; }
  });
  return trashed;
}

// ---- Gọi từ lịch tự động (mỗi tối ~21:30 JST) ----
// Trình kích hoạt theo giờ: không có người dùng web → chạy với quyền hệ thống (chỉ sao lưu, không trả dữ liệu).
// Chỉ chạy khi là chủ, hoặc đúng trình kích hoạt của project (e.triggerUid) — người ngoài gọi thẳng → FORBIDDEN.
function runScheduledBackup(e) {
  const uid = e && e.triggerUid;
  const ours = !!uid && ScriptApp.getProjectTriggers().some((t) => t.getUniqueId && t.getUniqueId() === String(uid) && t.getHandlerFunction() === BACKUP_HANDLER);
  if (!ours) requireAccess_();
  return asSystem_(runScheduledBackupNow_);
}

function runScheduledBackupNow_() {
  const props = scriptProps_();
  const now = new Date();
  const today = jst_(now, 'yyyy-MM-dd');
  props.setProperty(stateKey_('BACKUP_LAST_RUN'), jst_(now, 'yyyy-MM-dd HH:mm:ss'));
  if (!isBackupDay_(today)) return 'SKIP_NOT_BACKUP_DAY';
  try {
    return withLock_(() => {
      const folders = backupFolders_(props);
      if (listBackupFiles_(folders.backup).some((b) => b.kind === 'auto' && b.date === today)) return 'SKIP_ALREADY_DONE';
      return backupNow_('auto');
    });
  } catch (e) {
    props.setProperty(stateKey_('BACKUP_LAST_ERROR'), JSON.stringify({ at: jst_(now, 'yyyy-MM-dd HH:mm:ss'), msg: String(e && e.message || e) }));
    throw e;
  }
}

// ---- Hàm gọi từ giao diện ----

function enableAutoBackup() {
  requireOwner_();
  return withLock_(() => {
    const exists = ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === BACKUP_HANDLER);
    if (!exists) {
      ScriptApp.newTrigger(BACKUP_HANDLER).timeBased().everyDays(1).atHour(21).nearMinute(30).inTimezone('Asia/Tokyo').create();
    }
    return getBackupStatus();
  });
}

function backupNow() {
  requireAccess_();
  return withLock_(() => { backupNow_('manual'); return getBackupStatus(); });
}

function getBackupStatus() {
  requireAccess_();
  const props = scriptProps_();
  const folders = backupFolders_(props);
  const pairs = {};
  listBackupFiles_(folders.backup).forEach((b) => {
    const p = pairs[b.key] || (pairs[b.key] = { key: b.key, date: b.date, time: b.time.slice(0, 2) + ':' + b.time.slice(2, 4) + ':' + b.time.slice(4), kind: b.kind, files: 0 });
    p.files++;
  });
  const list = Object.keys(pairs).map((k) => pairs[k])
    .map((p) => ({ key: p.key, date: p.date, time: p.time, kind: p.kind, complete: p.files === BACKUP_FILES.length }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));
  const lastOk = props.getProperty(stateKey_('BACKUP_LAST_OK'));
  const lastErrorRaw = props.getProperty(stateKey_('BACKUP_LAST_ERROR'));
  const today = jst_(new Date(), 'yyyy-MM-dd');
  const ageDays = lastOk ? Math.round((Date.parse(today) - Date.parse(lastOk.slice(0, 10))) / 86400000) : null;
  return {
    autoEnabled: ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === BACKUP_HANDLER),
    lastOk: lastOk,
    lastRun: props.getProperty(stateKey_('BACKUP_LAST_RUN')),
    lastError: lastErrorRaw ? JSON.parse(lastErrorRaw) : null,
    stale: ageDays === null || ageDays > BACKUP_STALE_DAYS,
    folderUrl: folders.backup.getUrl(),
    backups: list.slice(0, 20),
  };
}

// Khôi phục: sao lưu hiện trạng trước → tạo bản làm việc mới từ bản sao lưu → file cũ sang "Đã thay thế".
function restoreBackup(key) {
  requireOwner_();
  return withLock_(() => {
    const props = scriptProps_();
    const folders = backupFolders_(props);
    const chosen = listBackupFiles_(folders.backup).filter((b) => b.key === key);
    const byFile = {};
    BACKUP_FILES.forEach((k) => { byFile[k] = chosen.find((b) => b.base === NAMES[k]); });
    if (BACKUP_FILES.some((k) => !byFile[k])) throw new Error('BACKUP_INCOMPLETE|' + key);

    const safety = backupNow_('pre-restore');
    const replaced = getOrCreateFolder_(props, 'REPLACED_FOLDER', folders.backup, []);
    const stamp = jst_(new Date(), 'yyyy-MM-dd_HHmmss');
    // Tạo đủ cả cặp bản mới TRƯỚC, rồi mới đổi sang dùng — lỗi giữa chừng thì app vẫn dùng cặp cũ.
    const current = {};
    const fresh = {};
    BACKUP_FILES.forEach((k) => {
      current[k] = findSaved_(props, k, (id) => DriveApp.getFileById(id));
      fresh[k] = byFile[k].file.makeCopy(NAMES[k], folders.root);
    });
    BACKUP_FILES.forEach((k) => props.setProperty(propKey_(k), fresh[k].getId()));
    BACKUP_FILES.forEach((k) => {
      current[k].setName(NAMES[k] + '__replaced_' + stamp);
      current[k].moveTo(replaced);
    });
    return { restoredFrom: key, safetyBackup: safety, status: getBackupStatus() };
  });
}
